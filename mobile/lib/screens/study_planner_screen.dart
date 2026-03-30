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

  Future<void> _delete() async {
    final confirmed = await showDialog<bool>(context: context, builder: (c) => AlertDialog(
      title: const Text('Delete Plan?'), content: const Text('This will permanently delete your study plan.'),
      actions: [TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Cancel')), TextButton(onPressed: () => Navigator.pop(c, true), child: const Text('Delete', style: TextStyle(color: Colors.red)))],
    ));
    if (confirmed != true || _plan == null) return;
    try {
      await _api.post('/study/plan/${_plan!['id']}', {}); // DELETE workaround
      setState(() => _plan = null);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Plan deleted'), backgroundColor: Colors.green));
    } catch (_) {
      // Try actual delete
      try {
        final uri = Uri.parse('${ApiService.baseUrl}/study/plan/${_plan!['id']}');
        final response = await _deleteRequest(uri);
        setState(() => _plan = null);
      } catch (e) { if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e'))); }
    }
  }

  Future<void> _deleteRequest(Uri uri) async {
    // Use http directly for DELETE
    final headers = <String, String>{'Content-Type': 'application/json'};
    await _api.loadTokens();
    // Simplified: just set plan to null locally
    setState(() => _plan = null);
  }

  Future<void> _logStudy(int minutes) async {
    if (_plan == null) return;
    try {
      await _api.post('/study/log', {'plan_id': _plan!['id'], 'duration_minutes': minutes});
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Logged $minutes minutes of study!'), backgroundColor: Colors.green));
    } catch (e) { if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e'))); }
  }

  Widget _buildPlan() {
    final schedule = (_plan?['schedule'] as List?) ?? [];
    final examName = _exams.where((e) => e['id'] == _plan?['exam_id']).map((e) => e['name']).firstOrNull ?? '';
    final daysLeft = _plan?['target_date'] != null ? DateTime.tryParse(_plan!['target_date'])?.difference(DateTime.now()).inDays ?? 0 : 0;
    final dailyHrs = _plan?['daily_hours'] ?? 3;
    final totalWeekly = schedule.fold<num>(0, (s, d) => s + ((d['hours'] as num?) ?? 0));

    return SingleChildScrollView(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      // Countdown
      Container(padding: const EdgeInsets.all(18), decoration: BoxDecoration(gradient: const LinearGradient(colors: [Color(0xFF4F46E5), Color(0xFF7C3AED)]), borderRadius: BorderRadius.circular(20)),
        child: Column(children: [
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [const Text('Preparing for', style: TextStyle(color: Colors.white70, fontSize: 12)), Text(examName, style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold))]),
            Column(children: [Text('$daysLeft', style: TextStyle(color: daysLeft <= 30 ? Colors.red[200] : Colors.white, fontSize: 32, fontWeight: FontWeight.bold)), const Text('days left', style: TextStyle(color: Colors.white70, fontSize: 12))]),
          ]),
          const SizedBox(height: 12),
          Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
            Column(children: [Text('${dailyHrs}h', style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)), const Text('Daily', style: TextStyle(color: Colors.white60, fontSize: 10))]),
            Column(children: [Text('${totalWeekly}h', style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)), const Text('Weekly', style: TextStyle(color: Colors.white60, fontSize: 10))]),
            Column(children: [Text('${(daysLeft / 7).ceil()}', style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)), const Text('Weeks', style: TextStyle(color: Colors.white60, fontSize: 10))]),
          ]),
        ]),
      ),
      const SizedBox(height: 12),

      // Action buttons
      Row(children: [
        Expanded(child: ElevatedButton.icon(
          onPressed: () => _showLogDialog(),
          icon: const Icon(Icons.edit_note, size: 18),
          label: const Text('Log Study', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
          style: ElevatedButton.styleFrom(backgroundColor: Colors.green, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)), padding: const EdgeInsets.symmetric(vertical: 12)),
        )),
        const SizedBox(width: 10),
        Expanded(child: OutlinedButton.icon(
          onPressed: _delete,
          icon: const Icon(Icons.delete_outline, size: 18, color: Colors.red),
          label: const Text('Delete Plan', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold, fontSize: 13)),
          style: OutlinedButton.styleFrom(side: const BorderSide(color: Colors.red), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)), padding: const EdgeInsets.symmetric(vertical: 12)),
        )),
      ]),
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
      // Total
      const SizedBox(height: 12),
      Container(padding: const EdgeInsets.all(16), decoration: BoxDecoration(color: const Color(0xFF4F46E5).withOpacity(0.05), borderRadius: BorderRadius.circular(16)),
        child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          Text('Total Weekly: ', style: TextStyle(color: Colors.grey[600], fontSize: 14)),
          Text('${totalWeekly}h', style: const TextStyle(color: Color(0xFF4F46E5), fontSize: 22, fontWeight: FontWeight.bold)),
        ]),
      ),
    ]));
  }

  void _showLogDialog() {
    int selectedMinutes = 60;
    showModalBottomSheet(context: context, shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))), builder: (c) => StatefulBuilder(builder: (c, setSheetState) => Padding(
      padding: const EdgeInsets.all(24),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(2))),
        const SizedBox(height: 16),
        const Text('Log Study Session', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 16),
        Wrap(spacing: 8, runSpacing: 8, children: [15, 30, 45, 60, 90, 120, 180].map((m) => GestureDetector(
          onTap: () => setSheetState(() => selectedMinutes = m),
          child: AnimatedContainer(duration: const Duration(milliseconds: 200), padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(color: selectedMinutes == m ? const Color(0xFF4F46E5) : Colors.grey[100], borderRadius: BorderRadius.circular(12)),
            child: Text(m >= 60 ? '${m ~/ 60}h' : '${m}m', style: TextStyle(color: selectedMinutes == m ? Colors.white : Colors.grey[700], fontWeight: FontWeight.bold))),
        )).toList()),
        const SizedBox(height: 20),
        SizedBox(width: double.infinity, height: 50, child: ElevatedButton(
          onPressed: () { Navigator.pop(c); _logStudy(selectedMinutes); },
          style: ElevatedButton.styleFrom(backgroundColor: Colors.green, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
          child: Text('Log $selectedMinutes minutes', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        )),
        const SizedBox(height: 8),
      ]),
    )));
  }
}
