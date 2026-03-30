import 'package:flutter/material.dart';
import '../services/api_service.dart';

class MistakesScreen extends StatefulWidget {
  const MistakesScreen({super.key});
  @override
  State<MistakesScreen> createState() => _MistakesScreenState();
}

class _MistakesScreenState extends State<MistakesScreen> {
  final _api = ApiService();
  List<dynamic> _mistakes = [];
  Map<String, dynamic>? _summary;
  bool _loading = true;
  String? _expandedId;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    try { final r = await _api.get('/mistakes'); if (mounted) setState(() => _mistakes = r['data']); } catch (_) {}
    try { final r = await _api.get('/mistakes/summary'); if (mounted) setState(() => _summary = r['data']); } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Mistake Book'), centerTitle: true),
      body: _loading ? const Center(child: CircularProgressIndicator()) : RefreshIndicator(
        onRefresh: _load,
        child: SingleChildScrollView(physics: const AlwaysScrollableScrollPhysics(), padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          // Summary
          if (_summary != null) Row(children: [
            _summaryCard('${_summary!['unresolved']}', 'Unresolved', Colors.red),
            const SizedBox(width: 10),
            _summaryCard('${_summary!['resolved']}', 'Resolved', Colors.green),
            const SizedBox(width: 10),
            _summaryCard('${_summary!['total']}', 'Total', Colors.grey[700]!),
          ]),
          const SizedBox(height: 16),

          // Mistakes list
          if (_mistakes.isEmpty) const Center(child: Padding(padding: EdgeInsets.all(40), child: Text('No mistakes yet. Keep practicing!', style: TextStyle(color: Colors.grey))))
          else ..._mistakes.map((m) {
            final expanded = _expandedId == m['id'];
            return GestureDetector(
              onTap: () => setState(() => _expandedId = expanded ? null : m['id']),
              child: Container(
                margin: const EdgeInsets.only(bottom: 10), padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white, borderRadius: BorderRadius.circular(14),
                  border: Border(left: BorderSide(color: m['is_resolved'] == true ? Colors.green : Colors.red, width: 4)),
                ),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(m['question_text'] ?? '', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500), maxLines: expanded ? null : 2, overflow: expanded ? null : TextOverflow.ellipsis),
                  const SizedBox(height: 6),
                  Row(children: [
                    if (m['topic_name'] != null) Container(padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2), decoration: BoxDecoration(color: Colors.blue[50], borderRadius: BorderRadius.circular(6)), child: Text(m['topic_name'], style: TextStyle(color: Colors.blue[700], fontSize: 10))),
                    const SizedBox(width: 6),
                    Text('Revised ${m['revision_count']}x', style: TextStyle(color: Colors.grey[500], fontSize: 11)),
                  ]),
                  if (expanded && m['options'] != null) ...[
                    const SizedBox(height: 10),
                    ...(m['options'] as Map<String, dynamic>).entries.map((e) {
                      final isCorrect = (m['correct_answer'] as List?)?.contains(e.key) ?? false;
                      return Container(
                        margin: const EdgeInsets.only(bottom: 4), padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(color: isCorrect ? Colors.green[50] : Colors.grey[50], borderRadius: BorderRadius.circular(10), border: isCorrect ? Border.all(color: Colors.green[300]!) : null),
                        child: Row(children: [Text('${e.key}. ', style: TextStyle(fontWeight: FontWeight.bold, color: isCorrect ? Colors.green : Colors.grey[600])), Expanded(child: Text('${e.value}', style: TextStyle(fontSize: 13, color: isCorrect ? Colors.green[800] : Colors.grey[700]))), if (isCorrect) const Icon(Icons.check_circle, color: Colors.green, size: 16)]),
                      );
                    }),
                    if (m['explanation'] != null) ...[const SizedBox(height: 8), Container(padding: const EdgeInsets.all(10), decoration: BoxDecoration(color: Colors.blue[50], borderRadius: BorderRadius.circular(10)), child: Text(m['explanation'], style: TextStyle(color: Colors.blue[800], fontSize: 13, height: 1.4)))],
                  ],
                ]),
              ),
            );
          }),
        ])),
      ),
    );
  }

  Widget _summaryCard(String value, String label, Color color) => Expanded(child: Container(
    padding: const EdgeInsets.symmetric(vertical: 14), decoration: BoxDecoration(color: color.withOpacity(0.08), borderRadius: BorderRadius.circular(14)),
    child: Column(children: [Text(value, style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: color)), Text(label, style: TextStyle(color: Colors.grey[500], fontSize: 11))]),
  ));
}
