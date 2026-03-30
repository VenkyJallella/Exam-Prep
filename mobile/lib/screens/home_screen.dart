import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import 'practice_session_screen.dart';
import 'daily_quiz_screen.dart';
import 'leaderboard_screen.dart';
import 'coding_screen.dart';
import 'chatbot_screen.dart';
import 'subscription_screen.dart';

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
    final name = user?['full_name'] ?? 'Student';
    final email = user?['email'] ?? '';
    final xp = _gamification?['total_xp'] ?? _stats?['total_xp'] ?? 0;
    final level = _gamification?['level'] ?? _stats?['level'] ?? 1;
    final streak = _gamification?['current_streak'] ?? _stats?['current_streak'] ?? 0;
    final longest = _gamification?['longest_streak'] ?? 0;
    final questions = _stats?['total_questions_attempted'] ?? 0;
    final accuracy = _stats?['accuracy_pct'] ?? 0;
    final tests = _stats?['total_tests_taken'] ?? 0;
    final xpProgress = ((xp % 500) / 500 * 100).clamp(0, 100);

    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(children: [
          // Header card
          Container(
            width: double.infinity, padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [Color(0xFF4F46E5), Color(0xFF7C3AED), Color(0xFFEC4899)], begin: Alignment.topLeft, end: Alignment.bottomRight),
              borderRadius: BorderRadius.circular(24),
              boxShadow: [BoxShadow(color: const Color(0xFF4F46E5).withOpacity(0.3), blurRadius: 16, offset: const Offset(0, 8))],
            ),
            child: Column(children: [
              CircleAvatar(radius: 36, backgroundColor: Colors.white.withOpacity(0.2), child: Text(name.substring(0, 1).toUpperCase(), style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold))),
              const SizedBox(height: 10),
              Text(name, style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
              Text(email, style: const TextStyle(color: Colors.white70, fontSize: 13)),
              const SizedBox(height: 14),
              Row(mainAxisAlignment: MainAxisAlignment.spaceEvenly, children: [
                _profileStat('🔥', '$streak', 'Streak'),
                Container(width: 1, height: 30, color: Colors.white24),
                _profileStat('⭐', 'Lv $level', 'Level'),
                Container(width: 1, height: 30, color: Colors.white24),
                _profileStat('✨', '$xp', 'XP'),
                Container(width: 1, height: 30, color: Colors.white24),
                _profileStat('🏅', '$longest', 'Best'),
              ]),
              const SizedBox(height: 12),
              // XP progress bar
              Column(children: [
                Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                  Text('Level $level', style: const TextStyle(color: Colors.white70, fontSize: 11)),
                  Text('${500 - (xp % 500)} XP to Lv ${level + 1}', style: const TextStyle(color: Colors.white70, fontSize: 11)),
                ]),
                const SizedBox(height: 4),
                ClipRRect(borderRadius: BorderRadius.circular(4), child: LinearProgressIndicator(value: xpProgress / 100, backgroundColor: Colors.white24, color: Colors.white, minHeight: 6)),
              ]),
            ]),
          ),
          const SizedBox(height: 16),

          // Stats grid
          Row(children: [
            _miniStat('$questions', 'Questions', Icons.quiz_outlined, Colors.blue),
            const SizedBox(width: 10),
            _miniStat('${accuracy is double ? accuracy.toStringAsFixed(1) : accuracy}%', 'Accuracy', Icons.gps_fixed, Colors.green),
            const SizedBox(width: 10),
            _miniStat('$tests', 'Tests', Icons.assignment_outlined, Colors.purple),
          ]),
          const SizedBox(height: 20),

          // Menu items
          Container(
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 8)]),
            child: Column(children: [
              _profileMenuTile(Icons.bolt, 'Daily Quiz', '20 questions daily', Colors.amber, () => Navigator.push(context, MaterialPageRoute(builder: (_) => const DailyQuizScreen()))),
              _divider(),
              _profileMenuTile(Icons.leaderboard, 'Leaderboard', 'Compete with peers', Colors.deepPurple, () => Navigator.push(context, MaterialPageRoute(builder: (_) => const LeaderboardScreen()))),
              _divider(),
              _profileMenuTile(Icons.code, 'Coding', 'Solve problems', Colors.teal, () => Navigator.push(context, MaterialPageRoute(builder: (_) => const CodingScreen()))),
              _divider(),
              _profileMenuTile(Icons.chat, 'AI Tutor', 'Ask anything', const Color(0xFF4F46E5), () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ChatbotScreen()))),
              _divider(),
              _profileMenuTile(Icons.workspace_premium, 'Subscription', 'Manage plan', Colors.orange, () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SubscriptionScreen()))),
            ]),
          ),
          const SizedBox(height: 16),

          // Logout
          SizedBox(width: double.infinity, child: OutlinedButton.icon(
            onPressed: () async { await context.read<AuthProvider>().logout(); if (mounted) Navigator.pushReplacementNamed(context, '/login'); },
            icon: const Icon(Icons.logout, color: Colors.red, size: 20),
            label: const Text('Logout', style: TextStyle(color: Colors.red, fontWeight: FontWeight.w600)),
            style: OutlinedButton.styleFrom(side: const BorderSide(color: Colors.red), padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
          )),
          const SizedBox(height: 8),
          Text('ExamPrep v1.0.0', style: TextStyle(color: Colors.grey[400], fontSize: 11)),
        ]),
      ),
    );
  }

  Widget _profileStat(String emoji, String value, String label) {
    return Column(children: [
      Text(emoji, style: const TextStyle(fontSize: 16)),
      const SizedBox(height: 2),
      Text(value, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
      Text(label, style: const TextStyle(color: Colors.white60, fontSize: 10)),
    ]);
  }

  Widget _miniStat(String value, String label, IconData icon, Color color) {
    return Expanded(child: Container(
      padding: const EdgeInsets.symmetric(vertical: 14),
      decoration: BoxDecoration(color: color.withOpacity(0.08), borderRadius: BorderRadius.circular(16)),
      child: Column(children: [
        Icon(icon, color: color, size: 20),
        const SizedBox(height: 4),
        Text(value, style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: color)),
        Text(label, style: TextStyle(color: Colors.grey[500], fontSize: 11)),
      ]),
    ));
  }

  Widget _profileMenuTile(IconData icon, String title, String subtitle, Color color, VoidCallback onTap) {
    return ListTile(
      onTap: onTap,
      leading: Container(width: 40, height: 40, decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(10)), child: Icon(icon, color: color, size: 20)),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
      subtitle: Text(subtitle, style: TextStyle(color: Colors.grey[500], fontSize: 12)),
      trailing: Icon(Icons.arrow_forward_ios, size: 14, color: Colors.grey[400]),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
    );
  }

  Widget _divider() => Divider(height: 1, indent: 70, color: Colors.grey[100]);

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
