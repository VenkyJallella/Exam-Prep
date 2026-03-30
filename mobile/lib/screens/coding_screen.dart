import 'package:flutter/material.dart';
import '../services/api_service.dart';

class CodingScreen extends StatefulWidget {
  const CodingScreen({super.key});
  @override
  State<CodingScreen> createState() => _CodingScreenState();
}

class _CodingScreenState extends State<CodingScreen> {
  final _api = ApiService();
  List<dynamic> _problems = [];
  bool _loading = true;
  String _diffFilter = '';

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    try {
      final params = _diffFilter.isNotEmpty ? '?difficulty=$_diffFilter' : '';
      final res = await _api.get('/coding$params');
      if (mounted) setState(() { _problems = res['data']; _loading = false; });
    } catch (_) { if (mounted) setState(() => _loading = false); }
  }

  Color _diffColor(String d) => d == 'easy' ? Colors.green : d == 'hard' ? Colors.red : Colors.orange;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Coding Practice'), centerTitle: true),
      body: Column(children: [
        // Difficulty filter
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
          child: Row(children: [
            _filterChip('All', ''),
            const SizedBox(width: 8),
            _filterChip('Easy', 'easy'),
            const SizedBox(width: 8),
            _filterChip('Medium', 'medium'),
            const SizedBox(width: 8),
            _filterChip('Hard', 'hard'),
          ]),
        ),

        Expanded(child: _loading
          ? const Center(child: CircularProgressIndicator())
          : _problems.isEmpty
            ? const Center(child: Text('No coding problems yet'))
            : RefreshIndicator(
                onRefresh: _load,
                child: ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: _problems.length,
                  itemBuilder: (context, i) {
                    final p = _problems[i];
                    final diff = p['difficulty'] ?? 'medium';
                    return Card(
                      margin: const EdgeInsets.only(bottom: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      elevation: 0,
                      color: Colors.white,
                      child: ListTile(
                        onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => CodingDetailScreen(slug: p['slug'], title: p['title']))),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        leading: Container(
                          width: 40, height: 40,
                          decoration: BoxDecoration(color: _diffColor(diff).withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
                          child: Center(child: Text('${i + 1}', style: TextStyle(color: _diffColor(diff), fontWeight: FontWeight.bold))),
                        ),
                        title: Text(p['title'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                        subtitle: Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Row(children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(color: _diffColor(diff).withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
                              child: Text(diff, style: TextStyle(color: _diffColor(diff), fontSize: 11, fontWeight: FontWeight.w600)),
                            ),
                            const SizedBox(width: 8),
                            Text('${(p['acceptance_rate'] ?? 0).toStringAsFixed(1)}% acc', style: TextStyle(color: Colors.grey[500], fontSize: 11)),
                          ]),
                        ),
                        trailing: const Icon(Icons.arrow_forward_ios, size: 16, color: Colors.grey),
                      ),
                    );
                  },
                ),
              ),
        ),
      ]),
    );
  }

  Widget _filterChip(String label, String value) {
    final sel = _diffFilter == value;
    return GestureDetector(
      onTap: () { setState(() { _diffFilter = value; _loading = true; }); _load(); },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: sel ? const Color(0xFF4F46E5) : Colors.grey[100],
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(label, style: TextStyle(color: sel ? Colors.white : Colors.grey[700], fontWeight: sel ? FontWeight.bold : FontWeight.w500, fontSize: 13)),
      ),
    );
  }
}

// Coding Problem Detail
class CodingDetailScreen extends StatefulWidget {
  final String slug;
  final String title;
  const CodingDetailScreen({super.key, required this.slug, required this.title});
  @override
  State<CodingDetailScreen> createState() => _CodingDetailScreenState();
}

class _CodingDetailScreenState extends State<CodingDetailScreen> {
  final _api = ApiService();
  Map<String, dynamic>? _problem;
  bool _loading = true;
  final _codeController = TextEditingController();
  String _language = 'python';
  bool _submitting = false;
  Map<String, dynamic>? _result;

  @override
  void initState() { super.initState(); _loadProblem(); }

  Future<void> _loadProblem() async {
    try {
      final res = await _api.get('/coding/${widget.slug}');
      final p = res['data'];
      _codeController.text = (p['starter_code'] as Map<String, dynamic>?)?[_language] ?? '# Write your solution\n';
      if (mounted) setState(() { _problem = p; _loading = false; });
    } catch (_) { if (mounted) setState(() => _loading = false); }
  }

  Future<void> _submit() async {
    if (_codeController.text.trim().isEmpty) return;
    setState(() { _submitting = true; _result = null; });
    try {
      final res = await _api.post('/coding/${widget.slug}/submit', {'language': _language, 'code': _codeController.text});
      setState(() { _result = res['data']; _submitting = false; });
    } catch (e) {
      if (mounted) { ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e'))); setState(() => _submitting = false); }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return Scaffold(appBar: AppBar(title: Text(widget.title)), body: const Center(child: CircularProgressIndicator()));
    if (_problem == null) return Scaffold(appBar: AppBar(title: Text(widget.title)), body: const Center(child: Text('Problem not found')));

    final p = _problem!;
    final samples = (p['sample_test_cases'] as List?) ?? [];

    return Scaffold(
      appBar: AppBar(title: Text(widget.title, style: const TextStyle(fontSize: 16)), actions: [
        Container(
          margin: const EdgeInsets.only(right: 8),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(color: _diffColor(p['difficulty'] ?? 'medium').withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
          child: Text(p['difficulty'] ?? '', style: TextStyle(color: _diffColor(p['difficulty'] ?? 'medium'), fontWeight: FontWeight.bold, fontSize: 12)),
        ),
      ]),
      body: Column(children: [
        Expanded(child: DefaultTabController(length: 3, child: Column(children: [
          const TabBar(tabs: [Tab(text: 'Problem'), Tab(text: 'Code'), Tab(text: 'Result')], labelColor: Color(0xFF4F46E5), indicatorColor: Color(0xFF4F46E5)),
          Expanded(child: TabBarView(children: [
            // Problem tab
            SingleChildScrollView(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(p['description'] ?? '', style: const TextStyle(fontSize: 14, height: 1.6)),
              if (p['constraints'] != null) ...[const SizedBox(height: 16), Text('Constraints', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey[700])), const SizedBox(height: 4), Text(p['constraints'], style: TextStyle(fontSize: 13, color: Colors.grey[600]))],
              if (samples.isNotEmpty) ...[
                const SizedBox(height: 16),
                ...samples.asMap().entries.map((e) => Container(
                  margin: const EdgeInsets.only(bottom: 10), padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: Colors.grey[50], borderRadius: BorderRadius.circular(12)),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('Example ${e.key + 1}', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey[600], fontSize: 12)),
                    const SizedBox(height: 6),
                    Text('Input: ${e.value['input']}', style: const TextStyle(fontFamily: 'monospace', fontSize: 13)),
                    Text('Output: ${e.value['expected_output']}', style: const TextStyle(fontFamily: 'monospace', fontSize: 13)),
                  ]),
                )),
              ],
            ])),

            // Code tab
            Column(children: [
              Padding(padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8), child: Row(children: [
                DropdownButton<String>(value: _language, underline: const SizedBox(), items: ['python', 'javascript', 'java'].map((l) => DropdownMenuItem(value: l, child: Text(l, style: const TextStyle(fontSize: 13)))).toList(), onChanged: (v) => setState(() => _language = v!)),
                const Spacer(),
                ElevatedButton.icon(
                  onPressed: _submitting ? null : _submit,
                  icon: _submitting ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.play_arrow, size: 18),
                  label: Text(_submitting ? 'Running...' : 'Run', style: const TextStyle(fontWeight: FontWeight.bold)),
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.green, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                ),
              ])),
              Expanded(child: Container(
                color: const Color(0xFF1E1E2E), padding: const EdgeInsets.all(12),
                child: TextField(controller: _codeController, maxLines: null, expands: true, style: const TextStyle(fontFamily: 'monospace', fontSize: 13, color: Color(0xFFA6E3A1), height: 1.5),
                  decoration: const InputDecoration(border: InputBorder.none, hintText: '# Write your code here', hintStyle: TextStyle(color: Colors.grey))),
              )),
            ]),

            // Result tab
            _result == null
              ? const Center(child: Text('Submit code to see results', style: TextStyle(color: Colors.grey)))
              : SingleChildScrollView(padding: const EdgeInsets.all(16), child: Column(children: [
                  Container(
                    width: double.infinity, padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(color: _result!['status'] == 'accepted' ? Colors.green[50] : Colors.red[50], borderRadius: BorderRadius.circular(16), border: Border.all(color: _result!['status'] == 'accepted' ? Colors.green : Colors.red)),
                    child: Column(children: [
                      Icon(_result!['status'] == 'accepted' ? Icons.check_circle : Icons.cancel, color: _result!['status'] == 'accepted' ? Colors.green : Colors.red, size: 40),
                      const SizedBox(height: 8),
                      Text(_result!['status'] == 'accepted' ? 'Accepted!' : _result!['status'].toString().replaceAll('_', ' ').toUpperCase(), style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: _result!['status'] == 'accepted' ? Colors.green[800] : Colors.red[800])),
                      Text('${_result!['passed_test_cases']}/${_result!['total_test_cases']} test cases passed', style: TextStyle(color: Colors.grey[600])),
                    ]),
                  ),
                  if (_result!['error_message'] != null) ...[const SizedBox(height: 12), Container(padding: const EdgeInsets.all(12), decoration: BoxDecoration(color: Colors.red[50], borderRadius: BorderRadius.circular(12)), child: Text(_result!['error_message'], style: TextStyle(fontFamily: 'monospace', fontSize: 12, color: Colors.red[800])))],
                ])),
          ])),
        ]))),
      ]),
    );
  }

  Color _diffColor(String d) => d == 'easy' ? Colors.green : d == 'hard' ? Colors.red : Colors.orange;
}
