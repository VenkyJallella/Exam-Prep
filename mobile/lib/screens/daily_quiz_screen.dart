import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../services/api_service.dart';

class DailyQuizScreen extends StatefulWidget {
  const DailyQuizScreen({super.key});
  @override
  State<DailyQuizScreen> createState() => _DailyQuizScreenState();
}

class _DailyQuizScreenState extends State<DailyQuizScreen> {
  final _api = ApiService();
  Map<String, dynamic>? _quiz;
  List<dynamic> _questions = [];
  Map<String, String> _answers = {};
  int _currentQ = 0;
  bool _loading = true;
  bool _submitted = false;
  bool _alreadyAttempted = false;
  bool _started = false;
  Map<String, dynamic>? _result;

  @override
  void initState() { super.initState(); _loadQuiz(); }

  Future<void> _loadQuiz() async {
    try {
      final res = await _api.get('/quiz/today');
      final data = res['data'];
      if (data == null) { if (mounted) setState(() => _loading = false); return; }
      setState(() {
        _quiz = data;
        if (data['already_attempted'] == true) {
          _alreadyAttempted = true; _submitted = true; _result = data['attempt'];
          _questions = data['questions'] ?? [];
        } else {
          _questions = data['questions'] ?? [];
        }
        _loading = false;
      });
    } catch (_) { if (mounted) setState(() => _loading = false); }
  }

  Future<void> _submit() async {
    if (_quiz == null) return;
    try {
      final res = await _api.post('/quiz/today/submit', {'answers': _answers, 'time_taken_seconds': 300});
      setState(() { _result = res['data']; _submitted = true; });
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return Scaffold(appBar: AppBar(title: const Text('Daily Quiz')), body: const Center(child: CircularProgressIndicator()));
    if (_quiz == null) return Scaffold(appBar: AppBar(title: const Text('Daily Quiz')), body: const Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [Icon(Icons.quiz, size: 64, color: Colors.grey), SizedBox(height: 16), Text('No quiz today', style: TextStyle(fontSize: 18))])));

    if (_submitted && _result != null) {
      final acc = _result!['total_marks'] > 0 ? (_result!['correct_count'] / _result!['total_marks'] * 100).round() : 0;
      return Scaffold(
        appBar: AppBar(title: const Text('Quiz Results')),
        body: SingleChildScrollView(padding: const EdgeInsets.all(24), child: Column(children: [
          if (_alreadyAttempted) Container(padding: const EdgeInsets.all(8), margin: const EdgeInsets.only(bottom: 16), decoration: BoxDecoration(color: Colors.orange[50], borderRadius: BorderRadius.circular(12)), child: const Text('You already attempted today\'s quiz', style: TextStyle(color: Colors.orange, fontSize: 13))),
          Container(width: 110, height: 110, decoration: BoxDecoration(shape: BoxShape.circle, gradient: LinearGradient(colors: acc >= 70 ? [Colors.green, Colors.green[700]!] : [Colors.orange, Colors.orange[700]!])), child: Center(child: Text('$acc%', style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold)))),
          const SizedBox(height: 16),
          Text(_quiz!['title'] ?? 'Daily Quiz', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 20),
          Row(children: [
            _statBox('${_result!['correct_count']}', 'Correct', Colors.green),
            const SizedBox(width: 12),
            _statBox('${_result!['wrong_count']}', 'Wrong', Colors.red),
          ]),
          const SizedBox(height: 24),
          SizedBox(width: double.infinity, child: ElevatedButton(onPressed: () => Navigator.pop(context), style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF4F46E5), foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))), child: const Text('Back to Home', style: TextStyle(fontWeight: FontWeight.bold)))),
        ])),
      );
    }

    // Start screen
    if (!_started && _questions.isNotEmpty) {
      return Scaffold(
        backgroundColor: Colors.white,
        appBar: AppBar(title: const Text('Daily Quiz'), backgroundColor: Colors.white, elevation: 0),
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(children: [
            const SizedBox(height: 20),
            Container(
              width: 80, height: 80,
              decoration: BoxDecoration(gradient: const LinearGradient(colors: [Color(0xFFF59E0B), Color(0xFFEA580C)]), borderRadius: BorderRadius.circular(22)),
              child: const Center(child: Text('⚡', style: TextStyle(fontSize: 36))),
            ),
            const SizedBox(height: 20),
            Text(_quiz!['title'] ?? 'Daily Quiz', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: Colors.grey[50], borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.grey[200]!)),
              child: Column(children: [
                _infoRow('Questions', '${_questions.length}'),
                const Divider(height: 20),
                _infoRow('Time Limit', '${_quiz!['duration_minutes']} minutes'),
                const Divider(height: 20),
                _infoRow('Difficulty', 'Mixed'),
                const Divider(height: 20),
                _infoRow('Attempts', '1 per day', valueColor: Colors.red),
              ]),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: Colors.amber[50], borderRadius: BorderRadius.circular(14)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Instructions', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.amber[800], fontSize: 13)),
                const SizedBox(height: 6),
                Text('• Timer starts when you tap Start\n• Navigate between questions freely\n• Quiz auto-submits when time runs out\n• One attempt per day only',
                  style: TextStyle(color: Colors.amber[900], fontSize: 12, height: 1.5)),
              ]),
            ),
            const SizedBox(height: 28),
            SizedBox(width: double.infinity, height: 58, child: Container(
              decoration: BoxDecoration(gradient: const LinearGradient(colors: [Color(0xFFF59E0B), Color(0xFFEA580C)]), borderRadius: BorderRadius.circular(18),
                boxShadow: [BoxShadow(color: Colors.orange.withOpacity(0.3), blurRadius: 12, offset: const Offset(0, 6))]),
              child: ElevatedButton.icon(
                onPressed: () => setState(() => _started = true),
                icon: const Icon(Icons.play_arrow_rounded, size: 28),
                label: const Text('Start Quiz', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(backgroundColor: Colors.transparent, foregroundColor: Colors.white, shadowColor: Colors.transparent, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18))),
              ),
            )),
          ]),
        ),
      );
    }

    // Quiz taking
    final q = _questions[_currentQ];
    final options = q['options'] as Map<String, dynamic>;
    final selected = _answers[q['id']];

    return Scaffold(
      appBar: AppBar(title: Text('${_currentQ + 1} / ${_questions.length}'), actions: [Padding(padding: const EdgeInsets.only(right: 16), child: Center(child: Text('${_answers.length}/${_questions.length}', style: TextStyle(color: Colors.grey[600]))))]),
      body: Column(children: [
        LinearProgressIndicator(value: (_currentQ + 1) / _questions.length, color: const Color(0xFF4F46E5), backgroundColor: Colors.grey[200], minHeight: 5),
        Expanded(child: SingleChildScrollView(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Container(padding: const EdgeInsets.all(18), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 8)]),
            child: Text(q['question_text'] ?? '', style: const TextStyle(fontSize: 16, height: 1.5, fontWeight: FontWeight.w500))),
          const SizedBox(height: 14),
          ...options.entries.map((e) {
            final sel = selected == e.key;
            return Padding(padding: const EdgeInsets.only(bottom: 10), child: GestureDetector(
              onTap: () { HapticFeedback.selectionClick(); setState(() => _answers[q['id']] = e.key); },
              child: AnimatedContainer(duration: const Duration(milliseconds: 200), padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(color: sel ? const Color(0xFFEEF2FF) : Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: sel ? const Color(0xFF4F46E5) : Colors.grey[200]!, width: 2)),
                child: Row(children: [
                  AnimatedContainer(duration: const Duration(milliseconds: 200), width: 34, height: 34, decoration: BoxDecoration(color: sel ? const Color(0xFF4F46E5) : Colors.grey[200], borderRadius: BorderRadius.circular(10)),
                    child: Center(child: Text(e.key, style: TextStyle(color: sel ? Colors.white : Colors.grey[700], fontWeight: FontWeight.bold)))),
                  const SizedBox(width: 12),
                  Expanded(child: Text(e.value.toString(), style: TextStyle(fontSize: 15, fontWeight: sel ? FontWeight.w600 : FontWeight.normal))),
                ]),
              ),
            ));
          }),
        ]))),
        Container(padding: const EdgeInsets.fromLTRB(16, 8, 16, 24), color: Colors.white, child: Row(children: [
          if (_currentQ > 0) Expanded(child: OutlinedButton(onPressed: () => setState(() => _currentQ--), style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))), child: const Text('Previous'))),
          if (_currentQ > 0) const SizedBox(width: 12),
          Expanded(child: ElevatedButton(
            onPressed: _currentQ < _questions.length - 1 ? () => setState(() => _currentQ++) : _submit,
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF4F46E5), foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
            child: Text(_currentQ < _questions.length - 1 ? 'Next' : 'Submit Quiz (${_answers.length}/${_questions.length})', style: const TextStyle(fontWeight: FontWeight.bold)),
          )),
        ])),
      ]),
    );
  }

  Widget _statBox(String value, String label, Color color) => Expanded(child: Container(padding: const EdgeInsets.symmetric(vertical: 18), decoration: BoxDecoration(color: color.withOpacity(0.08), borderRadius: BorderRadius.circular(16)), child: Column(children: [Text(value, style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: color)), Text(label, style: TextStyle(color: Colors.grey[500], fontSize: 12))])));

  Widget _infoRow(String label, String value, {Color? valueColor}) => Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Text(label, style: TextStyle(color: Colors.grey[500], fontSize: 14)), Text(value, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: valueColor ?? Colors.grey[900]))]);
}
