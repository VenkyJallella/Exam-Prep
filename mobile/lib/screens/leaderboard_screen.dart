import 'package:flutter/material.dart';
import '../services/api_service.dart';

class LeaderboardScreen extends StatefulWidget {
  const LeaderboardScreen({super.key});
  @override
  State<LeaderboardScreen> createState() => _LeaderboardScreenState();
}

class _LeaderboardScreenState extends State<LeaderboardScreen> {
  final _api = ApiService();
  List<dynamic> _entries = [];
  Map<String, dynamic>? _myStats;
  bool _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    try {
      final res = await _api.get('/gamification/leaderboard');
      final statsRes = await _api.get('/gamification/me');
      if (mounted) setState(() { _entries = res['data']; _myStats = statsRes['data']; _loading = false; });
    } catch (_) { if (mounted) setState(() => _loading = false); }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Leaderboard'), centerTitle: true),
      body: _loading ? const Center(child: CircularProgressIndicator()) : RefreshIndicator(
        onRefresh: _load,
        child: ListView(children: [
          // My stats
          if (_myStats != null) Container(
            margin: const EdgeInsets.all(16), padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(gradient: const LinearGradient(colors: [Color(0xFF4F46E5), Color(0xFF7C3AED)]), borderRadius: BorderRadius.circular(18)),
            child: Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
              Column(children: [Text('${_myStats!['total_xp']}', style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)), const Text('XP', style: TextStyle(color: Colors.white70, fontSize: 12))]),
              Column(children: [Text('Level ${_myStats!['level']}', style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)), const Text('Level', style: TextStyle(color: Colors.white70, fontSize: 12))]),
              Column(children: [Text('${_myStats!['current_streak']}', style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)), const Text('Streak', style: TextStyle(color: Colors.white70, fontSize: 12))]),
            ]),
          ),
          // Entries
          ..._entries.asMap().entries.map((e) {
            final i = e.key;
            final entry = e.value;
            final isTop3 = i < 3;
            final medalColors = [Colors.amber, Colors.grey[400]!, Colors.orange[300]!];
            return ListTile(
              leading: isTop3
                ? CircleAvatar(backgroundColor: medalColors[i], child: Text('${i + 1}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)))
                : CircleAvatar(backgroundColor: Colors.grey[200], child: Text('${i + 1}', style: TextStyle(color: Colors.grey[700], fontWeight: FontWeight.bold))),
              title: Text(entry['display_name'] ?? 'User', style: const TextStyle(fontWeight: FontWeight.w600)),
              subtitle: Text('${entry['total_xp']} XP · Level ${entry['level']}', style: TextStyle(color: Colors.grey[500], fontSize: 12)),
              trailing: entry['current_streak'] > 0 ? Text('🔥 ${entry['current_streak']}d', style: const TextStyle(color: Colors.orange, fontWeight: FontWeight.bold, fontSize: 13)) : null,
            );
          }),
          if (_entries.isEmpty) const Padding(padding: EdgeInsets.all(40), child: Center(child: Text('No leaderboard data yet'))),
        ]),
      ),
    );
  }
}
