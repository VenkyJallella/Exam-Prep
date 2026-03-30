import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import 'practice_session_screen.dart';
import 'daily_quiz_screen.dart';
import 'leaderboard_screen.dart';
import 'coding_screen.dart';
import 'chatbot_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;
  Map<String, dynamic>? _stats;
  Map<String, dynamic>? _gamification;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final api = ApiService();
      final statsRes = await api.get('/users/me/stats');
      final gamRes = await api.get('/gamification/me');
      if (mounted) {
        setState(() {
          _stats = statsRes['data'];
          _gamification = gamRes['data'];
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;

    return Scaffold(
      body: [
        _buildDashboard(user),
        _buildPractice(),
        _buildProfile(user),
      ][_currentIndex],
      floatingActionButton: FloatingActionButton(
        onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ChatbotScreen())),
        backgroundColor: const Color(0xFF4F46E5),
        child: const Icon(Icons.chat_rounded, color: Colors.white),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (i) => setState(() => _currentIndex = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.dashboard_outlined), selectedIcon: Icon(Icons.dashboard), label: 'Dashboard'),
          NavigationDestination(icon: Icon(Icons.quiz_outlined), selectedIcon: Icon(Icons.quiz), label: 'Practice'),
          NavigationDestination(icon: Icon(Icons.person_outlined), selectedIcon: Icon(Icons.person), label: 'Profile'),
        ],
      ),
    );
  }

  Widget _buildDashboard(Map<String, dynamic>? user) {
    return SafeArea(
      child: RefreshIndicator(
        onRefresh: _loadData,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Greeting
              Text('Welcome back,', style: TextStyle(color: Colors.grey[600], fontSize: 15)),
              Text(user?['full_name']?.split(' ')[0] ?? 'Student', style: const TextStyle(fontSize: 26, fontWeight: FontWeight.bold)),
              const SizedBox(height: 20),

              // Stats cards
              if (_loading)
                const Center(child: CircularProgressIndicator())
              else ...[
                Row(children: [
                  _statCard('Questions', '${_stats?['total_questions_attempted'] ?? 0}', Colors.blue),
                  const SizedBox(width: 12),
                  _statCard('Accuracy', '${(_stats?['accuracy_pct'] ?? 0).toStringAsFixed(1)}%', Colors.green),
                ]),
                const SizedBox(height: 12),
                Row(children: [
                  _statCard('Streak', '${_gamification?['current_streak'] ?? 0} days', Colors.orange),
                  const SizedBox(width: 12),
                  _statCard('XP', '${_gamification?['total_xp'] ?? 0}', Colors.purple),
                ]),
                const SizedBox(height: 24),

                // Quick actions
                const Text('Quick Actions', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                _actionCard(Icons.play_circle_filled, 'Start Practice', 'AI-powered questions', const Color(0xFF4F46E5), () => setState(() => _currentIndex = 1)),
                _actionCard(Icons.bolt, 'Daily Quiz', '20 questions, 20 minutes', Colors.amber[700]!, () => Navigator.push(context, MaterialPageRoute(builder: (_) => const DailyQuizScreen()))),
                _actionCard(Icons.code, 'Coding', 'Solve coding problems', Colors.teal, () => Navigator.push(context, MaterialPageRoute(builder: (_) => const CodingScreen()))),
                _actionCard(Icons.leaderboard, 'Leaderboard', 'Compete with peers', Colors.deepPurple, () => Navigator.push(context, MaterialPageRoute(builder: (_) => const LeaderboardScreen()))),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _statCard(String label, String value, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withOpacity(0.2)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(value, style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: color)),
            const SizedBox(height: 4),
            Text(label, style: TextStyle(color: Colors.grey[600], fontSize: 13)),
          ],
        ),
      ),
    );
  }

  Widget _actionCard(IconData icon, String title, String subtitle, Color color, VoidCallback onTap) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        onTap: onTap,
        leading: Container(
          width: 48, height: 48,
          decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
          child: Icon(icon, color: color),
        ),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(subtitle, style: TextStyle(color: Colors.grey[500], fontSize: 13)),
        trailing: const Icon(Icons.arrow_forward_ios, size: 16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        tileColor: Colors.grey[50],
      ),
    );
  }

  Widget _buildPractice() {
    return const PracticeTab();
  }

  Widget _buildProfile(Map<String, dynamic>? user) {
    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            const SizedBox(height: 20),
            CircleAvatar(
              radius: 40,
              backgroundColor: const Color(0xFF4F46E5),
              child: Text(user?['full_name']?.substring(0, 1).toUpperCase() ?? 'U', style: const TextStyle(color: Colors.white, fontSize: 30, fontWeight: FontWeight.bold)),
            ),
            const SizedBox(height: 12),
            Text(user?['full_name'] ?? 'Student', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            Text(user?['email'] ?? '', style: TextStyle(color: Colors.grey[500])),
            const SizedBox(height: 8),
            if (_gamification != null) ...[
              Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                _badge('🔥 ${_gamification!['current_streak']} streak', Colors.orange),
                const SizedBox(width: 8),
                _badge('⭐ Level ${_gamification!['level']}', Colors.blue),
                const SizedBox(width: 8),
                _badge('✨ ${_gamification!['total_xp']} XP', Colors.green),
              ]),
            ],
            const SizedBox(height: 24),
            _profileTile(Icons.analytics, 'Analytics', () => ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Analytics coming in next update')))),
            _profileTile(Icons.bolt, 'Daily Quiz', () => Navigator.push(context, MaterialPageRoute(builder: (_) => const DailyQuizScreen()))),
            _profileTile(Icons.leaderboard, 'Leaderboard', () => Navigator.push(context, MaterialPageRoute(builder: (_) => const LeaderboardScreen()))),
            _profileTile(Icons.workspace_premium, 'Subscription', () => ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Manage at examprep.in/subscription')))),
            _profileTile(Icons.settings, 'Settings', () => ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Settings coming in next update')))),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () async {
                  await context.read<AuthProvider>().logout();
                  if (mounted) Navigator.pushReplacementNamed(context, '/login');
                },
                icon: const Icon(Icons.logout, color: Colors.red),
                label: const Text('Logout', style: TextStyle(color: Colors.red)),
                style: OutlinedButton.styleFrom(side: const BorderSide(color: Colors.red), padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _badge(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(20)),
      child: Text(text, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w600)),
    );
  }

  Widget _profileTile(IconData icon, String title, VoidCallback onTap) {
    return ListTile(
      onTap: onTap,
      leading: Icon(icon, color: Colors.grey[700]),
      title: Text(title),
      trailing: const Icon(Icons.arrow_forward_ios, size: 16),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    );
  }
}

// Practice Tab — interactive design
class PracticeTab extends StatefulWidget {
  const PracticeTab({super.key});
  @override
  State<PracticeTab> createState() => _PracticeTabState();
}

class _PracticeTabState extends State<PracticeTab> {
  final _api = ApiService();
  List<dynamic> _exams = [];
  List<dynamic> _subjects = [];
  Map<String, dynamic>? _selectedExam;
  Map<String, dynamic>? _selectedSubject;
  int _questionCount = 10;
  int? _difficulty;
  bool _loading = true;
  bool _starting = false;

  final _examIcons = {'UPSC': '🏛️', 'JEE': '⚙️', 'SSC CGL': '📋', 'Banking': '🏦', 'GATE CS': '💻', 'NEET': '🩺', 'CAT': '📊', 'Coding': '🖥️'};
  final _examColors = {'UPSC': [const Color(0xFF3B82F6), const Color(0xFF1D4ED8)], 'JEE': [const Color(0xFF10B981), const Color(0xFF059669)], 'SSC CGL': [const Color(0xFF8B5CF6), const Color(0xFF7C3AED)], 'Banking': [const Color(0xFFF97316), const Color(0xFFEA580C)], 'GATE CS': [const Color(0xFF06B6D4), const Color(0xFF0891B2)], 'NEET': [const Color(0xFFEC4899), const Color(0xFFDB2777)], 'CAT': [const Color(0xFFF59E0B), const Color(0xFFD97706)], 'Coding': [const Color(0xFF6366F1), const Color(0xFF4F46E5)]};

  @override
  void initState() {
    super.initState();
    _api.get('/exams').then((res) {
      if (mounted) setState(() { _exams = res['data']; _loading = false; });
    }).catchError((_) {
      if (mounted) setState(() => _loading = false);
    });
  }

  void _selectExam(Map<String, dynamic> exam) {
    setState(() { _selectedExam = exam; _selectedSubject = null; _subjects = []; });
    _api.get('/exams/${exam['slug']}/subjects').then((res) {
      if (mounted) setState(() => _subjects = res['data']);
    }).catchError((_) {});
  }

  Future<void> _startPractice() async {
    if (_selectedExam == null) return;
    setState(() => _starting = true);
    Navigator.push(context, MaterialPageRoute(
      builder: (_) => PracticeSessionScreen(examId: _selectedExam!['id'], examName: _selectedExam!['name'], subjectId: _selectedSubject?['id'], questionCount: _questionCount, difficulty: _difficulty),
    ));
    setState(() => _starting = false);
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            GestureDetector(
              onTap: () {
                final homeState = context.findAncestorStateOfType<_HomeScreenState>();
                homeState?.setState(() => homeState._currentIndex = 0);
              },
              child: Container(
                width: 40, height: 40,
                decoration: BoxDecoration(color: Colors.grey[100], borderRadius: BorderRadius.circular(12)),
                child: Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: Colors.grey[700]),
              ),
            ),
            const SizedBox(width: 12),
            const Expanded(child: Text('Start Practice', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold))),
          ]),
          const SizedBox(height: 4),
          Text('Select exam, subject, and preferences', style: TextStyle(color: Colors.grey[500], fontSize: 14)),
          const SizedBox(height: 24),

          // Exam cards grid
          Text('SELECT EXAM', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.grey[400], letterSpacing: 1.5)),
          const SizedBox(height: 12),
          if (_loading) const Center(child: CircularProgressIndicator())
          else GridView.builder(
            shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, crossAxisSpacing: 10, mainAxisSpacing: 10, childAspectRatio: 2.2),
            itemCount: _exams.length,
            itemBuilder: (context, i) {
              final exam = _exams[i];
              final selected = _selectedExam?['id'] == exam['id'];
              final colors = _examColors[exam['name']] ?? [const Color(0xFF4F46E5), const Color(0xFF7C3AED)];
              return GestureDetector(
                onTap: () => _selectExam(Map<String, dynamic>.from(exam)),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  decoration: BoxDecoration(
                    gradient: selected ? LinearGradient(colors: colors) : null,
                    color: selected ? null : Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: selected ? Colors.transparent : Colors.grey[200]!, width: selected ? 0 : 1.5),
                    boxShadow: selected ? [BoxShadow(color: colors[0].withOpacity(0.3), blurRadius: 12, offset: const Offset(0, 4))] : [],
                  ),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    child: Row(children: [
                      Text(_examIcons[exam['name']] ?? '📝', style: const TextStyle(fontSize: 24)),
                      const SizedBox(width: 10),
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
                        Text(exam['name'], style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: selected ? Colors.white : Colors.grey[900])),
                        Text(exam['description']?.toString().split('.')[0] ?? '', style: TextStyle(fontSize: 10, color: selected ? Colors.white70 : Colors.grey[500]), maxLines: 1, overflow: TextOverflow.ellipsis),
                      ])),
                      if (selected) const Icon(Icons.check_circle, color: Colors.white, size: 20),
                    ]),
                  ),
                ),
              );
            },
          ),

          // Subjects
          if (_subjects.isNotEmpty) ...[
            const SizedBox(height: 24),
            Text('SELECT SUBJECT', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.grey[400], letterSpacing: 1.5)),
            const SizedBox(height: 12),
            Wrap(spacing: 8, runSpacing: 8, children: _subjects.map((s) {
              final sel = _selectedSubject?['id'] == s['id'];
              return GestureDetector(
                onTap: () => setState(() => _selectedSubject = sel ? null : Map<String, dynamic>.from(s)),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  decoration: BoxDecoration(
                    color: sel ? const Color(0xFF4F46E5) : Colors.white,
                    borderRadius: BorderRadius.circular(25),
                    border: Border.all(color: sel ? const Color(0xFF4F46E5) : Colors.grey[300]!),
                    boxShadow: sel ? [BoxShadow(color: const Color(0xFF4F46E5).withOpacity(0.3), blurRadius: 8, offset: const Offset(0, 2))] : [],
                  ),
                  child: Text(s['name'], style: TextStyle(color: sel ? Colors.white : Colors.grey[700], fontWeight: sel ? FontWeight.bold : FontWeight.w500, fontSize: 13)),
                ),
              );
            }).toList()),
          ],

          // Settings
          if (_selectedExam != null) ...[
            const SizedBox(height: 24),
            Text('SETTINGS', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.grey[400], letterSpacing: 1.5)),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: Colors.grey[50], borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.grey[200]!)),
              child: Row(children: [
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('Questions', style: TextStyle(fontSize: 12, color: Colors.grey[500], fontWeight: FontWeight.w600)),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey[300]!)),
                    child: DropdownButton<int>(value: _questionCount, isExpanded: true, underline: const SizedBox(), icon: Icon(Icons.expand_more, color: Colors.grey[600]),
                      items: [5, 10, 15, 20, 30].map((n) => DropdownMenuItem(value: n, child: Text('$n', style: const TextStyle(fontWeight: FontWeight.w600)))).toList(),
                      onChanged: (v) => setState(() => _questionCount = v!)),
                  ),
                ])),
                const SizedBox(width: 16),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('Difficulty', style: TextStyle(fontSize: 12, color: Colors.grey[500], fontWeight: FontWeight.w600)),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey[300]!)),
                    child: DropdownButton<int?>(value: _difficulty, isExpanded: true, underline: const SizedBox(), icon: Icon(Icons.expand_more, color: Colors.grey[600]),
                      items: [const DropdownMenuItem(value: null, child: Text('Any', style: TextStyle(fontWeight: FontWeight.w600))),
                        ...[1,2,3,4,5].map((d) => DropdownMenuItem(value: d, child: Text(['Easy','Med-E','Med','Hard','V.Hard'][d-1], style: const TextStyle(fontWeight: FontWeight.w600))))],
                      onChanged: (v) => setState(() => _difficulty = v)),
                  ),
                ])),
              ]),
            ),

            // Start button
            const SizedBox(height: 28),
            SizedBox(width: double.infinity, height: 60, child: Container(
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [Color(0xFF4F46E5), Color(0xFF7C3AED)]),
                borderRadius: BorderRadius.circular(18),
                boxShadow: [BoxShadow(color: const Color(0xFF4F46E5).withOpacity(0.4), blurRadius: 16, offset: const Offset(0, 6))],
              ),
              child: ElevatedButton.icon(
                onPressed: _starting ? null : _startPractice,
                icon: _starting ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5)) : const Icon(Icons.play_arrow_rounded, size: 28),
                label: Text(_starting ? 'Preparing...' : 'Start Practice ($_questionCount Q)', style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold, letterSpacing: 0.5)),
                style: ElevatedButton.styleFrom(backgroundColor: Colors.transparent, foregroundColor: Colors.white, shadowColor: Colors.transparent, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18))),
              ),
            )),
          ],
        ]),
      ),
    );
  }
}
