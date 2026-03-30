import 'package:flutter/material.dart';
import '../services/api_service.dart';

class AnalyticsScreen extends StatefulWidget {
  const AnalyticsScreen({super.key});
  @override
  State<AnalyticsScreen> createState() => _AnalyticsScreenState();
}

class _AnalyticsScreenState extends State<AnalyticsScreen> {
  final _api = ApiService();
  Map<String, dynamic>? _stats;
  List<dynamic> _topics = [];
  List<dynamic> _progress = [];
  bool _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    try { final r = await _api.get('/users/me/stats'); if (mounted) setState(() => _stats = r['data']); } catch (_) {}
    try { final r = await _api.get('/analytics/topics'); if (mounted) setState(() => _topics = r['data']); } catch (_) {}
    try { final r = await _api.get('/analytics/progress?days=7'); if (mounted) setState(() => _progress = r['data']); } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Analytics'), centerTitle: true),
      body: _loading ? const Center(child: CircularProgressIndicator()) : RefreshIndicator(
        onRefresh: _load,
        child: SingleChildScrollView(physics: const AlwaysScrollableScrollPhysics(), padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          // Stats
          Row(children: [
            _statCard('${_stats?['total_questions_attempted'] ?? 0}', 'Questions', Colors.blue),
            const SizedBox(width: 10),
            _statCard('${(_stats?['accuracy_pct'] ?? 0).toStringAsFixed(1)}%', 'Accuracy', Colors.green),
          ]),
          const SizedBox(height: 10),
          Row(children: [
            _statCard('${_stats?['total_tests_taken'] ?? 0}', 'Tests', Colors.purple),
            const SizedBox(width: 10),
            _statCard('${_stats?['current_streak'] ?? 0}d', 'Streak', Colors.orange),
          ]),
          const SizedBox(height: 20),

          // 7-day progress
          const Text('7-Day Activity', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          if (_progress.isEmpty) const Text('No data yet', style: TextStyle(color: Colors.grey))
          else SizedBox(height: 120, child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: _progress.map<Widget>((d) {
            final max = _progress.map<int>((p) => (p['questions'] as int?) ?? 0).reduce((a, b) => a > b ? a : b).clamp(1, 9999);
            final h = ((d['questions'] ?? 0) / max * 80).clamp(4.0, 80.0);
            return Expanded(child: Padding(padding: const EdgeInsets.symmetric(horizontal: 2), child: Column(mainAxisAlignment: MainAxisAlignment.end, children: [
              Text('${d['questions'] ?? 0}', style: TextStyle(fontSize: 9, color: Colors.grey[500])),
              const SizedBox(height: 2),
              Container(height: h, decoration: BoxDecoration(color: const Color(0xFF4F46E5), borderRadius: BorderRadius.circular(4))),
              const SizedBox(height: 4),
              Text((d['date'] ?? '').toString().substring(8, 10), style: TextStyle(fontSize: 10, color: Colors.grey[400])),
            ])));
          }).toList())),
          const SizedBox(height: 24),

          // Topic performance
          const Text('Topic Performance', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          if (_topics.isEmpty) const Text('Practice to see topics', style: TextStyle(color: Colors.grey))
          else ..._topics.take(10).map((t) {
            final acc = (t['accuracy_pct'] ?? 0).toDouble();
            return Container(
              margin: const EdgeInsets.only(bottom: 10), padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                  Expanded(child: Text(t['topic_name'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14), overflow: TextOverflow.ellipsis)),
                  Text('${acc.toStringAsFixed(0)}%', style: TextStyle(fontWeight: FontWeight.bold, color: acc >= 70 ? Colors.green : acc >= 40 ? Colors.orange : Colors.red)),
                ]),
                const SizedBox(height: 6),
                ClipRRect(borderRadius: BorderRadius.circular(4), child: LinearProgressIndicator(value: acc / 100, backgroundColor: Colors.grey[200], color: acc >= 70 ? Colors.green : acc >= 40 ? Colors.orange : Colors.red, minHeight: 6)),
              ]),
            );
          }),
        ])),
      ),
    );
  }

  Widget _statCard(String value, String label, Color color) => Expanded(child: Container(
    padding: const EdgeInsets.all(16), decoration: BoxDecoration(color: color.withOpacity(0.08), borderRadius: BorderRadius.circular(16)),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(value, style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: color)),
      const SizedBox(height: 2),
      Text(label, style: TextStyle(color: Colors.grey[500], fontSize: 12)),
    ]),
  ));
}
