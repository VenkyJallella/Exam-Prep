import 'package:flutter/material.dart';
import '../services/api_service.dart';

class PracticeSessionScreen extends StatefulWidget {
  final String examId;
  final String examName;
  const PracticeSessionScreen({super.key, required this.examId, required this.examName});

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

  @override
  void initState() {
    super.initState();
    _startSession();
  }

  Future<void> _startSession() async {
    try {
      final res = await _api.post('/practice/sessions', {
        'exam_id': widget.examId,
        'question_count': 10,
      });
      _sessionId = res['data']['id'];
      final sessionRes = await _api.get('/practice/sessions/$_sessionId');
      if (mounted) setState(() { _questions = sessionRes['data']['questions']; _loading = false; });
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
        Navigator.pop(context);
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to start session')));
        Navigator.pop(context);
      }
    }
  }

  Future<void> _submitAnswer() async {
    if (_selectedAnswer == null || _answered || _sessionId == null) return;
    setState(() => _submitting = true);
    try {
      final q = _questions[_currentIndex];
      final res = await _api.post('/practice/sessions/$_sessionId/answer', {
        'question_id': q['id'],
        'selected_answer': [_selectedAnswer],
        'time_taken_seconds': 10,
      });
      final result = res['data'];
      setState(() {
        _answerResult = result;
        _answered = true;
        _submitting = false;
        if (result['is_correct'] == true) _correct++; else _wrong++;
      });
    } catch (_) {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _nextQuestion() async {
    if (_currentIndex < _questions.length - 1) {
      setState(() { _currentIndex++; _selectedAnswer = null; _answered = false; _answerResult = null; });
    } else {
      // Complete session
      try {
        final res = await _api.post('/practice/sessions/$_sessionId/complete');
        setState(() { _sessionComplete = true; _sessionResult = res['data']; });
      } catch (_) {
        setState(() => _sessionComplete = true);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(
        appBar: AppBar(title: Text(widget.examName)),
        body: const Center(child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [CircularProgressIndicator(), SizedBox(height: 16), Text('Preparing questions...')],
        )),
      );
    }

    if (_sessionComplete) return _buildResults();
    if (_questions.isEmpty) {
      return Scaffold(appBar: AppBar(title: Text(widget.examName)), body: const Center(child: Text('No questions available')));
    }

    final q = _questions[_currentIndex];
    final options = q['options'] as Map<String, dynamic>;

    return Scaffold(
      appBar: AppBar(
        title: Text('${_currentIndex + 1} / ${_questions.length}'),
        actions: [
          Center(child: Padding(
            padding: const EdgeInsets.only(right: 16),
            child: Text('$_correct ✓  $_wrong ✗', style: const TextStyle(fontSize: 14)),
          )),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Progress bar
            LinearProgressIndicator(
              value: (_currentIndex + 1) / _questions.length,
              backgroundColor: Colors.grey[200],
              color: const Color(0xFF4F46E5),
              minHeight: 4,
              borderRadius: BorderRadius.circular(2),
            ),
            const SizedBox(height: 20),

            // Question
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.grey[50],
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.grey[200]!),
              ),
              child: Text(q['question_text'] ?? '', style: const TextStyle(fontSize: 16, height: 1.5)),
            ),
            const SizedBox(height: 16),

            // Options
            ...options.entries.map((entry) {
              final key = entry.key;
              final value = entry.value;
              final isSelected = _selectedAnswer == key;
              final isCorrect = _answered && _answerResult?['correct_answer']?.contains(key) == true;
              final isWrong = _answered && isSelected && !isCorrect;

              Color borderColor = Colors.grey[300]!;
              Color bgColor = Colors.white;
              if (_answered) {
                if (isCorrect) { borderColor = Colors.green; bgColor = Colors.green.withOpacity(0.1); }
                else if (isWrong) { borderColor = Colors.red; bgColor = Colors.red.withOpacity(0.1); }
              } else if (isSelected) {
                borderColor = const Color(0xFF4F46E5); bgColor = const Color(0xFF4F46E5).withOpacity(0.05);
              }

              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: InkWell(
                  onTap: _answered ? null : () => setState(() => _selectedAnswer = key),
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: bgColor,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: borderColor, width: 2),
                    ),
                    child: Row(children: [
                      Container(
                        width: 32, height: 32,
                        decoration: BoxDecoration(
                          color: isSelected && !_answered ? const Color(0xFF4F46E5) : isCorrect ? Colors.green : isWrong ? Colors.red : Colors.grey[200],
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Center(child: Text(key, style: TextStyle(
                          color: (isSelected && !_answered) || isCorrect || isWrong ? Colors.white : Colors.grey[700],
                          fontWeight: FontWeight.bold,
                        ))),
                      ),
                      const SizedBox(width: 12),
                      Expanded(child: Text(value.toString(), style: const TextStyle(fontSize: 15))),
                      if (isCorrect) const Icon(Icons.check_circle, color: Colors.green, size: 20),
                      if (isWrong) const Icon(Icons.cancel, color: Colors.red, size: 20),
                    ]),
                  ),
                ),
              );
            }),

            // Explanation
            if (_answered && _answerResult?['explanation'] != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(color: Colors.blue[50], borderRadius: BorderRadius.circular(12)),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('Explanation', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blue, fontSize: 12)),
                  const SizedBox(height: 4),
                  Text(_answerResult!['explanation'], style: TextStyle(color: Colors.blue[900], fontSize: 14, height: 1.4)),
                ]),
              ),
            ],

            const SizedBox(height: 20),

            // Action button
            if (!_answered)
              SizedBox(
                height: 52,
                child: ElevatedButton(
                  onPressed: _selectedAnswer == null || _submitting ? null : _submitAnswer,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF4F46E5), foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: _submitting
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Text('Submit Answer', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                ),
              )
            else
              SizedBox(
                height: 52,
                child: ElevatedButton(
                  onPressed: _nextQuestion,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _answerResult?['is_correct'] == true ? Colors.green : const Color(0xFF4F46E5),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: Text(
                    _currentIndex < _questions.length - 1 ? 'Next Question →' : 'View Results',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                  ),
                ),
              ),

            // XP earned
            if (_answered) ...[
              const SizedBox(height: 8),
              Center(child: Text(
                _answerResult?['is_correct'] == true ? '✓ Correct! +${_answerResult?['xp_earned'] ?? 10} XP' : '✗ Wrong',
                style: TextStyle(
                  color: _answerResult?['is_correct'] == true ? Colors.green : Colors.red,
                  fontWeight: FontWeight.w600,
                ),
              )),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildResults() {
    final accuracy = _sessionResult?['accuracy_pct'] ?? (_questions.isNotEmpty ? (_correct / _questions.length * 100).round() : 0);
    final xpEarned = _sessionResult?['xp_earned'] ?? (_correct * 10 + _wrong * 2);

    return Scaffold(
      appBar: AppBar(title: const Text('Results')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            const SizedBox(height: 20),
            // Accuracy circle
            Container(
              width: 120, height: 120,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: accuracy >= 70 ? Colors.green : accuracy >= 40 ? Colors.orange : Colors.red,
              ),
              child: Center(child: Text('$accuracy%', style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold))),
            ),
            const SizedBox(height: 16),
            Text('Session Complete!', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.grey[900])),
            const SizedBox(height: 24),

            // Stats
            Row(children: [
              _resultCard('Correct', '$_correct', Colors.green),
              const SizedBox(width: 12),
              _resultCard('Wrong', '$_wrong', Colors.red),
              const SizedBox(width: 12),
              _resultCard('XP', '+$xpEarned', Colors.purple),
            ]),
            const SizedBox(height: 32),

            // Actions
            SizedBox(
              width: double.infinity, height: 52,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(context),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF4F46E5), foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: const Text('Practice More', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _resultCard(String label, String value, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 20),
        decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(16)),
        child: Column(children: [
          Text(value, style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: color)),
          const SizedBox(height: 4),
          Text(label, style: TextStyle(color: Colors.grey[600], fontSize: 13)),
        ]),
      ),
    );
  }
}
