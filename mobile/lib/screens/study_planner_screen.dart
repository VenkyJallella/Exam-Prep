import 'package:flutter/material.dart';
import '../services/api_service.dart';

class StudyPlannerScreen extends StatefulWidget {
  const StudyPlannerScreen({super.key});
  @override
  State<StudyPlannerScreen> createState() => _StudyPlannerScreenState();
}

class _StudyPlannerScreenState extends State<StudyPlannerScreen> {
  final _api = ApiService();
  Map<String, dynamic>? _plan;
  List<dynamic> _exams = [];
  bool _loading = true;
  bool _creating = false;
  String _selectedExam = '';
  String _targetDate = '';
  int _dailyHours = 3;

  final _dayColors = {'monday': Colors.blue, 'tuesday': Colors.green, 'wednesday': Colors.purple, 'thursday': Colors.orange, 'friday': Colors.pink, 'saturday': Colors.amber, 'sunday': Colors.red};

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    try { final r = await _api.get('/study/plan'); if (mounted) setState(() => _plan = r['data']); } catch (_) {}
    try { final r = await _api.get('/exams'); if (mounted) setState(() => _exams = r['data']); } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _create() async {
    if (_selectedExam.isEmpty || _targetDate.isEmpty) return;
    setState(() => _creating = true);
    try {
      final r = await _api.post('/study/plan', {'exam_id': _selectedExam, 'target_date': _targetDate, 'daily_hours': _dailyHours});
      setState(() => _plan = r['data']);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Plan created!'), backgroundColor: Colors.green));
    } catch (e) { if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e'))); }
    finally { if (mounted) setState(() => _creating = false); }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return Scaffold(appBar: AppBar(title: const Text('Study Planner')), body: const Center(child: CircularProgressIndicator()));

    return Scaffold(
      appBar: AppBar(title: const Text('Study Planner'), centerTitle: true),
      body: _plan == null ? _buildCreate() : _buildPlan(),
    );
  }

  Widget _buildCreate() => SingleChildScrollView(padding: const EdgeInsets.all(20), child: Column(children: [
    const Icon(Icons.calendar_month, size: 64, color: Colors.grey),
    const SizedBox(height: 16),
    const Text('No Study Plan Yet', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
    const SizedBox(height: 8),
    Text('Create a plan for your target exam', style: TextStyle(color: Colors.grey[500])),
    const SizedBox(height: 24),
    Container(padding: const EdgeInsets.all(16), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18)), child: Column(children: [
      DropdownButtonFormField<String>(value: _selectedExam.isEmpty ? null : _selectedExam, decoration: InputDecoration(labelText: 'Target Exam', border: OutlineInputBorder(borderRadius: BorderRadius.circular(12))),
        items: _exams.map((e) => DropdownMenuItem(value: e['id'] as String, child: Text(e['name'] as String))).toList(), onChanged: (v) => setState(() => _selectedExam = v ?? '')),
      const SizedBox(height: 14),
      TextFormField(decoration: InputDecoration(labelText: 'Exam Date (YYYY-MM-DD)', border: OutlineInputBorder(borderRadius: BorderRadius.circular(12))), onChanged: (v) => _targetDate = v),
      const SizedBox(height: 14),
      DropdownButtonFormField<int>(value: _dailyHours, decoration: InputDecoration(labelText: 'Daily Hours', border: OutlineInputBorder(borderRadius: BorderRadius.circular(12))),
        items: [1,2,3,4,5,6,8,10].map((h) => DropdownMenuItem(value: h, child: Text('$h hours'))).toList(), onChanged: (v) => setState(() => _dailyHours = v ?? 3)),
      const SizedBox(height: 18),
      SizedBox(width: double.infinity, height: 50, child: ElevatedButton(onPressed: _creating ? null : _create,
        style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF4F46E5), foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
        child: Text(_creating ? 'Creating...' : 'Generate Schedule', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)))),
    ])),
  ]));

  Widget _buildPlan() {
    final schedule = (_plan?['schedule'] as List?) ?? [];
    final examName = _exams.where((e) => e['id'] == _plan?['exam_id']).map((e) => e['name']).firstOrNull ?? '';
    final daysLeft = _plan?['target_date'] != null ? DateTime.tryParse(_plan!['target_date'])?.difference(DateTime.now()).inDays ?? 0 : 0;

    return SingleChildScrollView(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      // Countdown
      Container(padding: const EdgeInsets.all(18), decoration: BoxDecoration(gradient: const LinearGradient(colors: [Color(0xFF4F46E5), Color(0xFF7C3AED)]), borderRadius: BorderRadius.circular(20)),
        child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [const Text('Preparing for', style: TextStyle(color: Colors.white70, fontSize: 12)), Text(examName, style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold))]),
          Column(children: [Text('$daysLeft', style: TextStyle(color: daysLeft <= 30 ? Colors.red[200] : Colors.white, fontSize: 32, fontWeight: FontWeight.bold)), const Text('days left', style: TextStyle(color: Colors.white70, fontSize: 12))]),
        ]),
      ),
      const SizedBox(height: 20),

      const Text('Weekly Schedule', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
      const SizedBox(height: 12),
      ...schedule.map((day) {
        final color = _dayColors[day['day']] ?? Colors.grey;
        final todayName = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'][DateTime.now().weekday - 1];
        final isToday = day['day'] == todayName;
        return Container(
          margin: const EdgeInsets.only(bottom: 10), padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border(left: BorderSide(color: color, width: 4)),
            boxShadow: isToday ? [BoxShadow(color: color.withOpacity(0.2), blurRadius: 8)] : []),
          child: Row(children: [
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Text((day['day'] as String).substring(0, 1).toUpperCase() + (day['day'] as String).substring(1), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                if (isToday) ...[const SizedBox(width: 6), Container(padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1), decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(8)), child: Text('Today', style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold)))],
                const SizedBox(width: 6),
                Container(padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1), decoration: BoxDecoration(color: day['type'] == 'revision' ? Colors.amber[50] : Colors.blue[50], borderRadius: BorderRadius.circular(8)),
                  child: Text(day['type'] ?? 'study', style: TextStyle(color: day['type'] == 'revision' ? Colors.amber[800] : Colors.blue[800], fontSize: 10))),
              ]),
              const SizedBox(height: 4),
              Text(day['subject'] ?? '', style: TextStyle(color: color, fontWeight: FontWeight.w600, fontSize: 14)),
              if ((day['topics'] as List?)?.isNotEmpty ?? false) ...[const SizedBox(height: 4), Wrap(spacing: 4, runSpacing: 4, children: (day['topics'] as List).map((t) => Container(padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2), decoration: BoxDecoration(color: Colors.grey[100], borderRadius: BorderRadius.circular(6)), child: Text(t['name'] ?? '', style: TextStyle(fontSize: 10, color: Colors.grey[600])))).toList())],
            ])),
            Text('${day['hours']}h', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.grey[400])),
          ]),
        );
      }),
    ]));
  }
}
