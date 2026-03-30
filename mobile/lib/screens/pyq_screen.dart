import 'package:flutter/material.dart';
import '../services/api_service.dart';

class PYQScreen extends StatefulWidget {
  const PYQScreen({super.key});
  @override
  State<PYQScreen> createState() => _PYQScreenState();
}

class _PYQScreenState extends State<PYQScreen> {
  final _api = ApiService();
  List<dynamic> _exams = [];
  List<dynamic> _questions = [];
  String _selectedExam = '';
  String _selectedYear = '';
  bool _loading = false;
  String? _expandedId;
  final _years = ['2026','2025','2024','2023','2022','2021','2020'];

  @override
  void initState() { super.initState(); _api.get('/exams').then((r) { if (mounted) setState(() => _exams = r['data']); }).catchError((_) {}); }

  Future<void> _fetch() async {
    if (_selectedExam.isEmpty) return;
    setState(() => _loading = true);
    try {
      final r = await _api.get('/questions?exam_id=$_selectedExam');
      var qs = (r['data'] as List).where((q) => q['year'] != null || q['paper_source'] != null).toList();
      if (_selectedYear.isNotEmpty) qs = qs.where((q) => '${q['year']}' == _selectedYear).toList();
      if (mounted) setState(() { _questions = qs; _loading = false; });
    } catch (_) { if (mounted) setState(() => _loading = false); }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('PYQ Papers'), centerTitle: true),
      body: Column(children: [
        Padding(padding: const EdgeInsets.all(16), child: Row(children: [
          Expanded(child: Container(padding: const EdgeInsets.symmetric(horizontal: 12), decoration: BoxDecoration(border: Border.all(color: Colors.grey[300]!), borderRadius: BorderRadius.circular(12)),
            child: DropdownButton<String>(value: _selectedExam.isEmpty ? null : _selectedExam, hint: const Text('Exam'), isExpanded: true, underline: const SizedBox(),
              items: _exams.map((e) => DropdownMenuItem(value: e['id'] as String, child: Text(e['name'] as String))).toList(),
              onChanged: (v) { setState(() => _selectedExam = v ?? ''); _fetch(); }))),
          const SizedBox(width: 10),
          Container(padding: const EdgeInsets.symmetric(horizontal: 12), decoration: BoxDecoration(border: Border.all(color: Colors.grey[300]!), borderRadius: BorderRadius.circular(12)),
            child: DropdownButton<String>(value: _selectedYear.isEmpty ? null : _selectedYear, hint: const Text('Year'), underline: const SizedBox(),
              items: [const DropdownMenuItem(value: '', child: Text('All')), ..._years.map((y) => DropdownMenuItem(value: y, child: Text(y)))],
              onChanged: (v) { setState(() => _selectedYear = v ?? ''); _fetch(); })),
        ])),
        Expanded(child: _loading ? const Center(child: CircularProgressIndicator())
          : _questions.isEmpty ? Center(child: Text(_selectedExam.isEmpty ? 'Select an exam to view PYQ' : 'No PYQ found', style: TextStyle(color: Colors.grey[500])))
          : ListView.builder(padding: const EdgeInsets.symmetric(horizontal: 16), itemCount: _questions.length, itemBuilder: (c, i) {
            final q = _questions[i]; final expanded = _expandedId == q['id'];
            return GestureDetector(onTap: () => setState(() => _expandedId = expanded ? null : q['id']),
              child: Container(margin: const EdgeInsets.only(bottom: 10), padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border(left: BorderSide(color: const Color(0xFF4F46E5), width: 4))),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  if (q['paper_source'] != null) Container(margin: const EdgeInsets.only(bottom: 6), padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2), decoration: BoxDecoration(color: const Color(0xFF4F46E5).withOpacity(0.1), borderRadius: BorderRadius.circular(8)), child: Text(q['paper_source'], style: const TextStyle(color: Color(0xFF4F46E5), fontSize: 11, fontWeight: FontWeight.w600))),
                  Text(q['question_text'] ?? '', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500), maxLines: expanded ? null : 2, overflow: expanded ? null : TextOverflow.ellipsis),
                  if (expanded && q['options'] != null) ...[
                    const SizedBox(height: 10),
                    ...(q['options'] as Map<String, dynamic>).entries.map((e) {
                      final isCorrect = (q['correct_answer'] as List?)?.contains(e.key) ?? false;
                      return Container(margin: const EdgeInsets.only(bottom: 4), padding: const EdgeInsets.all(10), decoration: BoxDecoration(color: isCorrect ? Colors.green[50] : Colors.grey[50], borderRadius: BorderRadius.circular(10)),
                        child: Row(children: [Text('${e.key}. ', style: TextStyle(fontWeight: FontWeight.bold, color: isCorrect ? Colors.green : Colors.grey[600])), Expanded(child: Text('${e.value}', style: TextStyle(fontSize: 13, color: isCorrect ? Colors.green[800] : Colors.grey[700]))), if (isCorrect) const Icon(Icons.check_circle, color: Colors.green, size: 16)]));
                    }),
                    if (q['explanation'] != null) Container(margin: const EdgeInsets.only(top: 8), padding: const EdgeInsets.all(10), decoration: BoxDecoration(color: Colors.blue[50], borderRadius: BorderRadius.circular(10)), child: Text(q['explanation'], style: TextStyle(color: Colors.blue[800], fontSize: 13))),
                  ],
                ]),
              ),
            );
          })),
      ]),
    );
  }
}
