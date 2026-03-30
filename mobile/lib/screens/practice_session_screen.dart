import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../services/api_service.dart';

class PracticeSessionScreen extends StatefulWidget {
  final String examId;
  final String examName;
  final String? subjectId;
  final int questionCount;
  final int? difficulty;
  const PracticeSessionScreen({super.key, required this.examId, required this.examName, this.subjectId, this.questionCount = 10, this.difficulty});

  @override
  State<PracticeSessionScreen> createState() => _PracticeSessionScreenState();
}

class _PracticeSessionScreenState extends State<PracticeSessionScreen> {
  final _api = ApiService();
  List<dynamic> _questions = [];
  int _currentIndex = 0;
  String? _selectedAnswer;
  bool _loading = true;
  bool _submitting = false;
  bool _answered = false;
  Map<String, dynamic>? _answerResult;
  String? _sessionId;
  int _correct = 0;
  int _wrong = 0;
  bool _sessionComplete = false;
  Map<String, dynamic>? _sessionResult;
  bool _visible = false;

  @override
  void initState() {
    super.initState();
    _startSession();
  }

  Future<void> _startSession() async {
    try {
      final body = <String, dynamic>{'exam_id': widget.examId, 'question_count': widget.questionCount};
      if (widget.subjectId != null) body['subject_id'] = widget.subjectId;
      if (widget.difficulty != null) body['difficulty'] = widget.difficulty;
      final res = await _api.post('/practice/sessions', body);
      _sessionId = res['data']['id'];
      final sessionRes = await _api.get('/practice/sessions/$_sessionId');
      if (mounted) { setState(() { _questions = sessionRes['data']['questions']; _loading = false; _visible = true; }); }
    } on ApiException catch (e) {
      if (mounted) { ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message), backgroundColor: Colors.red)); Navigator.pop(context); }
    } catch (_) {
      if (mounted) { ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to start session'))); Navigator.pop(context); }
    }
  }

  Future<void> _submitAnswer() async {
    if (_selectedAnswer == null || _answered || _sessionId == null) return;
    HapticFeedback.mediumImpact();
    setState(() => _submitting = true);
    try {
      final q = _questions[_currentIndex];
      final res = await _api.post('/practice/sessions/$_sessionId/answer', {'question_id': q['id'], 'selected_answer': [_selectedAnswer], 'time_taken_seconds': 10});
      final result = res['data'];
      HapticFeedback.heavyImpact();
      setState(() { _answerResult = result; _answered = true; _submitting = false; if (result['is_correct'] == true) _correct++; else _wrong++; });
    } catch (_) { if (mounted) setState(() => _submitting = false); }
  }

  Future<void> _nextQuestion() async {
    if (_currentIndex < _questions.length - 1) {
      setState(() { _visible = false; });
      await Future.delayed(const Duration(milliseconds: 150));
      setState(() { _currentIndex++; _selectedAnswer = null; _answered = false; _answerResult = null; _visible = true; });
    } else {
      try {
        final res = await _api.post('/practice/sessions/$_sessionId/complete');
        setState(() { _sessionComplete = true; _sessionResult = res['data']; });
      } catch (_) { setState(() => _sessionComplete = true); }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(
        backgroundColor: Colors.white,
        body: Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Container(
            width: 80, height: 80,
            decoration: BoxDecoration(gradient: const LinearGradient(colors: [Color(0xFF4F46E5), Color(0xFF7C3AED)]), borderRadius: BorderRadius.circular(20)),
            child: const Center(child: Icon(Icons.quiz_rounded, color: Colors.white, size: 40)),
          ),
          const SizedBox(height: 24),
          const Text('Preparing Questions...', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Text(widget.examName, style: TextStyle(color: Colors.grey[500])),
          const SizedBox(height: 24),
          const SizedBox(width: 32, height: 32, child: CircularProgressIndicator(strokeWidth: 3, color: Color(0xFF4F46E5))),
        ])),
      );
    }

    if (_sessionComplete) return _buildResults();
    if (_questions.isEmpty) return Scaffold(appBar: AppBar(), body: const Center(child: Text('No questions available')));

    final q = _questions[_currentIndex];
    final options = q['options'] as Map<String, dynamic>;

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FC),
      appBar: AppBar(
        backgroundColor: Colors.white, elevation: 0, scrolledUnderElevation: 1,
        leading: IconButton(icon: const Icon(Icons.close, color: Colors.grey), onPressed: () => Navigator.pop(context)),
        title: Text('Q ${_currentIndex + 1}/${_questions.length}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 8),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(color: Colors.green.withOpacity(0.1), borderRadius: BorderRadius.circular(20)),
            child: Text('$_correct ✓', style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold, fontSize: 13)),
          ),
          Container(
            margin: const EdgeInsets.only(right: 12),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(color: Colors.red.withOpacity(0.1), borderRadius: BorderRadius.circular(20)),
            child: Text('$_wrong ✗', style: const TextStyle(color: Colors.red, fontWeight: FontWeight.bold, fontSize: 13)),
          ),
        ],
      ),
      body: AnimatedOpacity(
        opacity: _visible ? 1.0 : 0.0,
        duration: const Duration(milliseconds: 250),
        child: Column(children: [
          // Progress
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 16),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(value: (_currentIndex + 1) / _questions.length, backgroundColor: Colors.grey[200], color: const Color(0xFF4F46E5), minHeight: 6),
            ),
          ),

          Expanded(child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              // Question card
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white, borderRadius: BorderRadius.circular(20),
                  boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 2))],
                ),
                child: Text(q['question_text'] ?? '', style: const TextStyle(fontSize: 17, height: 1.6, fontWeight: FontWeight.w500)),
              ),
              const SizedBox(height: 16),

              // Options
              ...options.entries.map((entry) {
                final key = entry.key;
                final value = entry.value;
                final isSelected = _selectedAnswer == key;
                final isCorrect = _answered && _answerResult?['correct_answer']?.contains(key) == true;
                final isWrong = _answered && isSelected && !isCorrect;

                Color borderColor = Colors.grey[200]!;
                Color bgColor = Colors.white;
                Color textColor = Colors.grey[800]!;
                Color badgeColor = Colors.grey[300]!;
                Color badgeTextColor = Colors.grey[700]!;
                IconData? trailingIcon;

                if (_answered) {
                  if (isCorrect) { borderColor = Colors.green; bgColor = const Color(0xFFECFDF5); badgeColor = Colors.green; badgeTextColor = Colors.white; trailingIcon = Icons.check_circle_rounded; }
                  else if (isWrong) { borderColor = Colors.red; bgColor = const Color(0xFFFEF2F2); badgeColor = Colors.red; badgeTextColor = Colors.white; trailingIcon = Icons.cancel_rounded; }
                } else if (isSelected) {
                  borderColor = const Color(0xFF4F46E5); bgColor = const Color(0xFFEEF2FF); badgeColor = const Color(0xFF4F46E5); badgeTextColor = Colors.white;
                }

                return Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: GestureDetector(
                    onTap: _answered ? null : () { HapticFeedback.selectionClick(); setState(() => _selectedAnswer = key); },
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: bgColor, borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: borderColor, width: 2),
                        boxShadow: isSelected && !_answered ? [BoxShadow(color: const Color(0xFF4F46E5).withOpacity(0.15), blurRadius: 8, offset: const Offset(0, 2))] : [],
                      ),
                      child: Row(children: [
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          width: 36, height: 36,
                          decoration: BoxDecoration(color: badgeColor, borderRadius: BorderRadius.circular(10)),
                          child: Center(child: Text(key, style: TextStyle(color: badgeTextColor, fontWeight: FontWeight.bold, fontSize: 16))),
                        ),
                        const SizedBox(width: 14),
                        Expanded(child: Text(value.toString(), style: TextStyle(fontSize: 15, color: textColor, fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal))),
                        if (trailingIcon != null) Icon(trailingIcon, color: isCorrect ? Colors.green : Colors.red, size: 24),
                      ]),
                    ),
                  ),
                );
              }),

              // Explanation
              if (_answered && _answerResult?['explanation'] != null) ...[
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(colors: [Colors.blue[50]!, Colors.indigo[50]!]),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.blue[200]!),
                  ),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(children: [Icon(Icons.lightbulb_rounded, color: Colors.blue[600], size: 18), const SizedBox(width: 6), Text('Explanation', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blue[700], fontSize: 13))]),
                    const SizedBox(height: 8),
                    Text(_answerResult!['explanation'], style: TextStyle(color: Colors.blue[900], fontSize: 14, height: 1.5)),
                  ]),
                ),
              ],

              // XP badge
              if (_answered) ...[
                const SizedBox(height: 12),
                Center(child: AnimatedContainer(
                  duration: const Duration(milliseconds: 300),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: _answerResult?['is_correct'] == true ? Colors.green.withOpacity(0.1) : Colors.red.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    _answerResult?['is_correct'] == true ? '🎯 Correct! +${_answerResult?['xp_earned'] ?? 10} XP' : '❌ Incorrect',
                    style: TextStyle(color: _answerResult?['is_correct'] == true ? Colors.green[700] : Colors.red[700], fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                )),
              ],
              const SizedBox(height: 16),
            ]),
          )),

          // Bottom button
          Container(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
            decoration: BoxDecoration(color: Colors.white, boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, -2))]),
            child: SizedBox(width: double.infinity, height: 56, child: !_answered
              ? Container(
                  decoration: BoxDecoration(
                    gradient: _selectedAnswer != null ? const LinearGradient(colors: [Color(0xFF4F46E5), Color(0xFF7C3AED)]) : null,
                    color: _selectedAnswer == null ? Colors.grey[300] : null,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: ElevatedButton(
                    onPressed: _selectedAnswer == null || _submitting ? null : _submitAnswer,
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.transparent, foregroundColor: Colors.white, shadowColor: Colors.transparent, disabledBackgroundColor: Colors.transparent, disabledForegroundColor: Colors.grey[500], shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
                    child: _submitting ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5)) : const Text('Submit Answer', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
                  ),
                )
              : ElevatedButton.icon(
                  onPressed: _nextQuestion,
                  icon: Icon(_currentIndex < _questions.length - 1 ? Icons.arrow_forward_rounded : Icons.emoji_events_rounded),
                  label: Text(_currentIndex < _questions.length - 1 ? 'Next Question' : 'View Results', style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _answerResult?['is_correct'] == true ? Colors.green : const Color(0xFF4F46E5),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                ),
            ),
          ),
        ]),
      ),
    );
  }

  Widget _buildResults() {
    final accuracy = _sessionResult?['accuracy_pct'] ?? (_questions.isNotEmpty ? (_correct / _questions.length * 100).round() : 0);
    final xp = _sessionResult?['xp_earned'] ?? (_correct * 10 + _wrong * 2);

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(children: [
            const SizedBox(height: 40),
            Container(
              width: 130, height: 130,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(colors: accuracy >= 70 ? [Colors.green, Colors.green[700]!] : accuracy >= 40 ? [Colors.orange, Colors.orange[700]!] : [Colors.red, Colors.red[700]!]),
                boxShadow: [BoxShadow(color: (accuracy >= 70 ? Colors.green : accuracy >= 40 ? Colors.orange : Colors.red).withOpacity(0.3), blurRadius: 20, offset: const Offset(0, 8))],
              ),
              child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                Text('$accuracy%', style: const TextStyle(color: Colors.white, fontSize: 36, fontWeight: FontWeight.bold)),
                const Text('Accuracy', style: TextStyle(color: Colors.white70, fontSize: 12)),
              ]),
            ),
            const SizedBox(height: 24),
            const Text('Session Complete!', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
            Text('Great effort! Keep practicing.', style: TextStyle(color: Colors.grey[500], fontSize: 14)),
            const SizedBox(height: 32),

            Row(children: [
              _resultCard('✅', '$_correct', 'Correct', Colors.green),
              const SizedBox(width: 12),
              _resultCard('❌', '$_wrong', 'Wrong', Colors.red),
              const SizedBox(width: 12),
              _resultCard('⚡', '+$xp', 'XP', Colors.purple),
            ]),
            const SizedBox(height: 40),

            SizedBox(width: double.infinity, height: 56, child: Container(
              decoration: BoxDecoration(gradient: const LinearGradient(colors: [Color(0xFF4F46E5), Color(0xFF7C3AED)]), borderRadius: BorderRadius.circular(16), boxShadow: [BoxShadow(color: const Color(0xFF4F46E5).withOpacity(0.3), blurRadius: 12, offset: const Offset(0, 4))]),
              child: ElevatedButton.icon(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.replay_rounded),
                label: const Text('Practice More', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(backgroundColor: Colors.transparent, foregroundColor: Colors.white, shadowColor: Colors.transparent, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
              ),
            )),
            const SizedBox(height: 12),
            TextButton(onPressed: () => Navigator.pop(context), child: Text('Back to Home', style: TextStyle(color: Colors.grey[500]))),
          ]),
        ),
      ),
    );
  }

  Widget _resultCard(String emoji, String value, String label, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 20),
        decoration: BoxDecoration(
          color: color.withOpacity(0.08), borderRadius: BorderRadius.circular(20),
          border: Border.all(color: color.withOpacity(0.2)),
        ),
        child: Column(children: [
          Text(emoji, style: const TextStyle(fontSize: 24)),
          const SizedBox(height: 4),
          Text(value, style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: color)),
          Text(label, style: TextStyle(color: Colors.grey[500], fontSize: 12)),
        ]),
      ),
    );
  }
}
