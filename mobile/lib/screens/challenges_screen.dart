import 'package:flutter/material.dart';
import '../services/api_service.dart';

class ChallengesScreen extends StatefulWidget {
  const ChallengesScreen({super.key});
  @override
  State<ChallengesScreen> createState() => _ChallengesScreenState();
}

class _ChallengesScreenState extends State<ChallengesScreen> {
  final _api = ApiService();
  List<dynamic> _challenges = [];
  Map<String, dynamic>? _stats;
  bool _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    try {
      final r = await _api.get('/challenges');
      if (mounted) setState(() { _challenges = r['data']['challenges']; _stats = r['data']['stats']; _loading = false; });
    } catch (_) { if (mounted) setState(() => _loading = false); }
  }

  @override
  Widget build(BuildContext context) {
    final completed = _challenges.where((c) => c['completed'] == true).length;
    return Scaffold(
      appBar: AppBar(title: const Text('Weekly Challenges'), centerTitle: true),
      body: _loading ? const Center(child: CircularProgressIndicator()) : SingleChildScrollView(padding: const EdgeInsets.all(16), child: Column(children: [
        // Progress
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(gradient: const LinearGradient(colors: [Color(0xFF4F46E5), Color(0xFF7C3AED)]), borderRadius: BorderRadius.circular(20)),
          child: Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
            Column(children: [Text('$completed/${_challenges.length}', style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)), const Text('Completed', style: TextStyle(color: Colors.white70, fontSize: 12))]),
            Column(children: [Text('${_stats?['questions_this_week'] ?? 0}', style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)), const Text('Questions', style: TextStyle(color: Colors.white70, fontSize: 12))]),
            Column(children: [Text('${_stats?['active_days'] ?? 0}', style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)), const Text('Days Active', style: TextStyle(color: Colors.white70, fontSize: 12))]),
          ]),
        ),
        const SizedBox(height: 16),
        ..._challenges.map((c) {
          final pct = c['type'] == 'accuracy' ? ((c['progress'] ?? 0) / (c['target'] ?? 1) * 100).clamp(0, 100) : ((c['progress'] ?? 0) / (c['target'] ?? 1) * 100).clamp(0, 100);
          return Container(
            margin: const EdgeInsets.only(bottom: 10), padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border(left: BorderSide(color: c['completed'] == true ? Colors.green : const Color(0xFF4F46E5), width: 4))),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Expanded(child: Text(c['title'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15))),
                if (c['completed'] == true) Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2), decoration: BoxDecoration(color: Colors.green[50], borderRadius: BorderRadius.circular(10)), child: const Text('Done!', style: TextStyle(color: Colors.green, fontSize: 11, fontWeight: FontWeight.bold))),
                Text('+${c['xp_reward']} XP', style: TextStyle(color: c['completed'] == true ? Colors.green : Colors.grey[500], fontWeight: FontWeight.bold)),
              ]),
              const SizedBox(height: 4),
              Text(c['description'] ?? '', style: TextStyle(color: Colors.grey[500], fontSize: 12)),
              const SizedBox(height: 8),
              ClipRRect(borderRadius: BorderRadius.circular(4), child: LinearProgressIndicator(value: pct / 100, backgroundColor: Colors.grey[200], color: c['completed'] == true ? Colors.green : const Color(0xFF4F46E5), minHeight: 6)),
              const SizedBox(height: 4),
              Text(c['type'] == 'accuracy' ? '${c['progress']}% / ${c['target']}%' : '${c['progress']} / ${c['target']}', style: TextStyle(color: Colors.grey[400], fontSize: 11)),
            ]),
          );
        }),
      ])),
    );
  }
}
