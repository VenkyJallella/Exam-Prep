import 'package:flutter/material.dart';
import '../services/api_service.dart';

class MockTestsScreen extends StatefulWidget {
  const MockTestsScreen({super.key});
  @override
  State<MockTestsScreen> createState() => _MockTestsScreenState();
}

class _MockTestsScreenState extends State<MockTestsScreen> {
  final _api = ApiService();
  List<dynamic> _tests = [];
  List<dynamic> _attempts = [];
  bool _loading = true;
  int _tab = 0;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    try { final r = await _api.get('/tests'); if (mounted) setState(() => _tests = r['data']); } catch (_) {}
    try { final r = await _api.get('/tests/attempts'); if (mounted) setState(() => _attempts = r['data']); } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Mock Tests'), centerTitle: true),
      body: _loading ? const Center(child: CircularProgressIndicator()) : Column(children: [
        // Tabs
        Padding(padding: const EdgeInsets.all(16), child: Row(children: [
          _tabBtn('Available (${_tests.length})', 0),
          const SizedBox(width: 8),
          _tabBtn('My Attempts (${_attempts.length})', 1),
        ])),
        Expanded(child: RefreshIndicator(onRefresh: _load, child: _tab == 0 ? _buildTests() : _buildAttempts())),
      ]),
    );
  }

  Widget _tabBtn(String label, int index) => Expanded(child: GestureDetector(
    onTap: () => setState(() => _tab = index),
    child: AnimatedContainer(duration: const Duration(milliseconds: 200), padding: const EdgeInsets.symmetric(vertical: 10),
      decoration: BoxDecoration(color: _tab == index ? const Color(0xFF4F46E5) : Colors.grey[100], borderRadius: BorderRadius.circular(12)),
      child: Text(label, textAlign: TextAlign.center, style: TextStyle(color: _tab == index ? Colors.white : Colors.grey[600], fontWeight: FontWeight.bold, fontSize: 13)),
    ),
  ));

  Widget _buildTests() => ListView.builder(padding: const EdgeInsets.symmetric(horizontal: 16), itemCount: _tests.length, itemBuilder: (c, i) {
    final t = _tests[i];
    final attempted = _attempts.any((a) => a['test_id'] == t['id'] && a['status'] != 'in_progress');
    return Container(
      margin: const EdgeInsets.only(bottom: 10), padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: attempted ? Border.all(color: Colors.green[200]!) : null),
      child: Row(children: [
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(t['title'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
          const SizedBox(height: 4),
          Row(children: [
            Text('${t['duration_minutes']}min', style: TextStyle(color: Colors.grey[500], fontSize: 12)),
            const SizedBox(width: 10),
            Text('${t['total_marks']} marks', style: TextStyle(color: Colors.grey[500], fontSize: 12)),
            if ((t['negative_marking_pct'] ?? 0) > 0) ...[const SizedBox(width: 10), Text('-${t['negative_marking_pct']}%', style: const TextStyle(color: Colors.red, fontSize: 12))],
          ]),
        ])),
        if (attempted) Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4), decoration: BoxDecoration(color: Colors.green[50], borderRadius: BorderRadius.circular(10)), child: const Text('Done', style: TextStyle(color: Colors.green, fontSize: 12, fontWeight: FontWeight.bold)))
        else ElevatedButton(onPressed: () async {
          try {
            final res = await _api.post('/tests/${t['id']}/start');
            if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Test started! Open web app to take the test.'), backgroundColor: Colors.green));
          } catch (e) { if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e'))); }
        }, style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF4F46E5), foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))), child: const Text('Start', style: TextStyle(fontWeight: FontWeight.bold))),
      ]),
    );
  });

  Widget _buildAttempts() => _attempts.isEmpty ? const Center(child: Text('No attempts yet')) : ListView.builder(padding: const EdgeInsets.symmetric(horizontal: 16), itemCount: _attempts.length, itemBuilder: (c, i) {
    final a = _attempts[i];
    return Container(
      margin: const EdgeInsets.only(bottom: 10), padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14)),
      child: Row(children: [
        Container(width: 40, height: 40, decoration: BoxDecoration(color: a['status'] == 'submitted' ? Colors.green[50] : Colors.orange[50], borderRadius: BorderRadius.circular(10)),
          child: Icon(a['status'] == 'submitted' ? Icons.check : Icons.timer, color: a['status'] == 'submitted' ? Colors.green : Colors.orange, size: 20)),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Score: ${a['total_score']}/${a['max_score']}', style: const TextStyle(fontWeight: FontWeight.bold)),
          Text('Accuracy: ${a['accuracy_pct']}%', style: TextStyle(color: Colors.grey[500], fontSize: 12)),
        ])),
        Text(a['status'] ?? '', style: TextStyle(color: a['status'] == 'submitted' ? Colors.green : Colors.orange, fontSize: 12, fontWeight: FontWeight.bold)),
      ]),
    );
  });
}
