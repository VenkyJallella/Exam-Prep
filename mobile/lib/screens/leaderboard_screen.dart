import 'package:flutter/material.dart';
import '../services/api_service.dart';

class LeaderboardScreen extends StatefulWidget {
  const LeaderboardScreen({super.key});
  @override
  State<LeaderboardScreen> createState() => _LeaderboardScreenState();
}

class _LeaderboardScreenState extends State<LeaderboardScreen> {
  final _api = ApiService();
  List<dynamic> _global = [];
  List<dynamic> _weekly = [];
  Map<String, dynamic>? _myStats;
  bool _loading = true;
  int _tabIndex = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final results = await Future.wait([
        _api.get('/gamification/leaderboard'),
        _api.get('/gamification/leaderboard/weekly'),
        _api.get('/gamification/me'),
      ]);
      if (mounted) setState(() { _global = results[0]['data']; _weekly = results[1]['data']; _myStats = results[2]['data']; _loading = false; });
    } catch (_) { if (mounted) setState(() => _loading = false); }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FC),
      appBar: AppBar(title: const Text('Leaderboard'), centerTitle: true, backgroundColor: Colors.white, elevation: 0),
      body: _loading ? const Center(child: CircularProgressIndicator()) : RefreshIndicator(
        onRefresh: _load,
        child: CustomScrollView(slivers: [
          // My Stats Card
          if (_myStats != null) SliverToBoxAdapter(child: Container(
            margin: const EdgeInsets.all(16),
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [Color(0xFF4F46E5), Color(0xFF7C3AED), Color(0xFFEC4899)], begin: Alignment.topLeft, end: Alignment.bottomRight),
              borderRadius: BorderRadius.circular(24),
              boxShadow: [BoxShadow(color: const Color(0xFF4F46E5).withOpacity(0.3), blurRadius: 16, offset: const Offset(0, 8))],
            ),
            child: Column(children: [
              const Text('Your Stats', style: TextStyle(color: Colors.white70, fontSize: 13)),
              const SizedBox(height: 12),
              Row(mainAxisAlignment: MainAxisAlignment.spaceEvenly, children: [
                _myStatItem('🏆', '${_myStats!['total_xp']}', 'XP'),
                Container(width: 1, height: 40, color: Colors.white24),
                _myStatItem('⭐', 'Lv ${_myStats!['level']}', 'Level'),
                Container(width: 1, height: 40, color: Colors.white24),
                _myStatItem('🔥', '${_myStats!['current_streak']}d', 'Streak'),
                Container(width: 1, height: 40, color: Colors.white24),
                _myStatItem('🏅', '${(_myStats!['badges'] is List ? (_myStats!['badges'] as List).length : 0)}', 'Badges'),
              ]),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(20)),
                child: Text('Best Streak: ${_myStats!['longest_streak']} days', style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
              ),
            ]),
          )),

          // Tab bar
          SliverToBoxAdapter(child: Container(
            margin: const EdgeInsets.symmetric(horizontal: 16),
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(color: Colors.grey[100], borderRadius: BorderRadius.circular(14)),
            child: Row(children: [
              Expanded(child: GestureDetector(
                onTap: () => setState(() => _tabIndex = 0),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  decoration: BoxDecoration(color: _tabIndex == 0 ? Colors.white : Colors.transparent, borderRadius: BorderRadius.circular(12), boxShadow: _tabIndex == 0 ? [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4)] : []),
                  child: Text('All Time', textAlign: TextAlign.center, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: _tabIndex == 0 ? const Color(0xFF4F46E5) : Colors.grey[500])),
                ),
              )),
              Expanded(child: GestureDetector(
                onTap: () => setState(() => _tabIndex = 1),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  decoration: BoxDecoration(color: _tabIndex == 1 ? Colors.white : Colors.transparent, borderRadius: BorderRadius.circular(12), boxShadow: _tabIndex == 1 ? [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4)] : []),
                  child: Text('This Week', textAlign: TextAlign.center, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: _tabIndex == 1 ? const Color(0xFF4F46E5) : Colors.grey[500])),
                ),
              )),
            ]),
          )),

          // List
          SliverFillRemaining(child: _buildList(_tabIndex == 0 ? _global : _weekly)),
        ]),
      ),
    );
  }

  Widget _buildList(List<dynamic> entries) {
    if (entries.isEmpty) return const Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [Icon(Icons.emoji_events_outlined, size: 64, color: Colors.grey), SizedBox(height: 12), Text('No data yet', style: TextStyle(color: Colors.grey, fontSize: 16))]));

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: entries.length,
      itemBuilder: (context, i) {
        final e = entries[i];
        final rank = i + 1;
        return Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: rank <= 3 ? [const Color(0xFFFFFBEB), const Color(0xFFF0F0F0), const Color(0xFFFFF7ED)][rank - 1] : Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: rank <= 3 ? Border.all(color: [Colors.amber[300]!, Colors.grey[300]!, Colors.orange[200]!][rank - 1], width: 1.5) : null,
            boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 4, offset: const Offset(0, 2))],
          ),
          child: Row(children: [
            SizedBox(width: 36, child: rank <= 3
              ? Text(['🥇', '🥈', '🥉'][rank - 1], style: const TextStyle(fontSize: 24), textAlign: TextAlign.center)
              : Text('$rank', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.grey[500]), textAlign: TextAlign.center)),
            const SizedBox(width: 12),
            CircleAvatar(
              radius: 20,
              backgroundColor: rank <= 3 ? [Colors.amber, Colors.grey[400]!, Colors.orange[300]!][rank - 1] : const Color(0xFF4F46E5).withOpacity(0.1),
              child: Text((e['display_name'] ?? 'U').substring(0, 1).toUpperCase(), style: TextStyle(color: rank <= 3 ? Colors.white : const Color(0xFF4F46E5), fontWeight: FontWeight.bold, fontSize: 16)),
            ),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(e['display_name'] ?? 'User', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15, color: Colors.grey[900])),
              const SizedBox(height: 2),
              Row(children: [
                Text('${e['total_xp']} XP', style: TextStyle(color: Colors.grey[500], fontSize: 12)),
                const SizedBox(width: 8),
                Container(width: 4, height: 4, decoration: BoxDecoration(color: Colors.grey[300], shape: BoxShape.circle)),
                const SizedBox(width: 8),
                Text('Level ${e['level']}', style: TextStyle(color: Colors.grey[500], fontSize: 12)),
              ]),
            ])),
            if ((e['current_streak'] ?? 0) > 0) Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(color: Colors.orange.withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                const Text('🔥', style: TextStyle(fontSize: 12)),
                const SizedBox(width: 2),
                Text('${e['current_streak']}d', style: const TextStyle(color: Colors.orange, fontWeight: FontWeight.bold, fontSize: 12)),
              ]),
            ),
          ]),
        );
      },
    );
  }

  Widget _myStatItem(String emoji, String value, String label) {
    return Column(children: [
      Text(emoji, style: const TextStyle(fontSize: 20)),
      const SizedBox(height: 4),
      Text(value, style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
      Text(label, style: const TextStyle(color: Colors.white60, fontSize: 11)),
    ]);
  }
}
