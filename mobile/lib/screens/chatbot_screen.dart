import 'package:flutter/material.dart';
import '../services/api_service.dart';

class ChatbotScreen extends StatefulWidget {
  const ChatbotScreen({super.key});
  @override
  State<ChatbotScreen> createState() => _ChatbotScreenState();
}

class _ChatbotScreenState extends State<ChatbotScreen> {
  final _api = ApiService();
  final _controller = TextEditingController();
  final _scrollController = ScrollController();
  final List<Map<String, String>> _messages = [];
  bool _loading = false;
  int _remaining = 5;

  final _suggestions = ['How is my performance?', 'Where to improve?', 'Tips for UPSC', 'Study plan for this week'];

  @override
  void initState() {
    super.initState();
    _messages.add({'role': 'assistant', 'content': "Hi! I'm your ExamPrep AI tutor 🤖\n\nI can help with:\n• Performance analysis\n• Study strategies\n• Exam tips\n• General knowledge\n\nWhat would you like to know?"});
    _loadUsage();
  }

  Future<void> _loadUsage() async {
    try {
      final res = await _api.get('/chatbot/usage');
      if (mounted) setState(() => _remaining = res['data']['remaining'] ?? 5);
    } catch (_) {}
  }

  Future<void> _send([String? text]) async {
    final msg = (text ?? _controller.text).trim();
    if (msg.isEmpty || _loading) return;
    _controller.clear();
    setState(() { _messages.add({'role': 'user', 'content': msg}); _loading = true; });
    _scrollToBottom();

    try {
      final history = _messages.map((m) => {'role': m['role']!, 'content': m['content']!}).toList();
      final res = await _api.post('/chatbot/message', {'message': msg, 'history': history});
      if (mounted) setState(() { _messages.add({'role': 'assistant', 'content': res['data']['response']}); _loading = false; _remaining = (_remaining - 1).clamp(0, 999); });
    } catch (e) {
      if (mounted) setState(() { _messages.add({'role': 'assistant', 'content': 'Sorry, something went wrong. Please try again.'}); _loading = false; });
    }
    _scrollToBottom();
  }

  void _scrollToBottom() {
    Future.delayed(const Duration(milliseconds: 100), () {
      if (_scrollController.hasClients) _scrollController.animateTo(_scrollController.position.maxScrollExtent, duration: const Duration(milliseconds: 300), curve: Curves.easeOut);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Row(children: [Text('🤖', style: TextStyle(fontSize: 22)), SizedBox(width: 8), Text('AI Tutor', style: TextStyle(fontWeight: FontWeight.bold))]),
        backgroundColor: Colors.white, elevation: 0, scrolledUnderElevation: 1,
        actions: [Container(
          margin: const EdgeInsets.only(right: 12),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(color: Colors.grey[100], borderRadius: BorderRadius.circular(12)),
          child: Text('$_remaining left', style: TextStyle(color: Colors.grey[600], fontSize: 12, fontWeight: FontWeight.w600)),
        )],
      ),
      body: Column(children: [
        // Messages
        Expanded(child: ListView.builder(
          controller: _scrollController,
          padding: const EdgeInsets.all(16),
          itemCount: _messages.length + (_loading ? 1 : 0),
          itemBuilder: (context, i) {
            if (i == _messages.length && _loading) {
              return Align(alignment: Alignment.centerLeft, child: Container(
                margin: const EdgeInsets.only(top: 8), padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(color: Colors.grey[100], borderRadius: BorderRadius.circular(18)),
                child: Row(mainAxisSize: MainAxisSize.min, children: List.generate(3, (j) => Container(
                  margin: EdgeInsets.only(right: j < 2 ? 4 : 0), width: 8, height: 8,
                  decoration: BoxDecoration(color: Colors.grey[400], shape: BoxShape.circle),
                ))),
              ));
            }
            final msg = _messages[i];
            final isUser = msg['role'] == 'user';
            return Align(
              alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
              child: Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(14),
                constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.8),
                decoration: BoxDecoration(
                  color: isUser ? const Color(0xFF4F46E5) : Colors.grey[100],
                  borderRadius: BorderRadius.only(
                    topLeft: const Radius.circular(18), topRight: const Radius.circular(18),
                    bottomLeft: Radius.circular(isUser ? 18 : 4), bottomRight: Radius.circular(isUser ? 4 : 18),
                  ),
                ),
                child: _renderMessage(msg['content'] ?? '', isUser),
              ),
            );
          },
        )),

        // Suggestions
        if (_messages.length <= 2 && !_loading)
          SizedBox(height: 40, child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            children: _suggestions.map((s) => Padding(
              padding: const EdgeInsets.only(right: 8),
              child: GestureDetector(
                onTap: () => _send(s),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(color: const Color(0xFF4F46E5).withOpacity(0.08), borderRadius: BorderRadius.circular(20)),
                  child: Text(s, style: const TextStyle(color: Color(0xFF4F46E5), fontSize: 12, fontWeight: FontWeight.w600)),
                ),
              ),
            )).toList(),
          )),

        // Input
        Container(
          padding: const EdgeInsets.fromLTRB(16, 8, 8, 24),
          decoration: BoxDecoration(color: Colors.white, boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, -2))]),
          child: Row(children: [
            Expanded(child: TextField(
              controller: _controller,
              onSubmitted: (_) => _send(),
              decoration: InputDecoration(
                hintText: 'Ask me anything...',
                hintStyle: TextStyle(color: Colors.grey[400]),
                filled: true, fillColor: Colors.grey[50],
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: BorderSide.none),
                contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
              ),
            )),
            const SizedBox(width: 8),
            GestureDetector(
              onTap: _loading ? null : () => _send(),
              child: Container(
                width: 44, height: 44,
                decoration: BoxDecoration(gradient: const LinearGradient(colors: [Color(0xFF4F46E5), Color(0xFF7C3AED)]), borderRadius: BorderRadius.circular(22)),
                child: const Icon(Icons.send_rounded, color: Colors.white, size: 20),
              ),
            ),
          ]),
        ),
      ]),
    );
  }

  Widget _renderMessage(String text, bool isUser) {
    // Strip markdown and render as rich text
    final color = isUser ? Colors.white : Colors.grey[800]!;
    final lines = text.split('\n');

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: lines.map((line) {
        final trimmed = line.trim();
        if (trimmed.isEmpty) return const SizedBox(height: 6);

        // Bold text: **text**
        final spans = <TextSpan>[];
        final boldRegex = RegExp(r'\*\*(.+?)\*\*');
        int lastEnd = 0;
        for (final match in boldRegex.allMatches(trimmed)) {
          if (match.start > lastEnd) spans.add(TextSpan(text: trimmed.substring(lastEnd, match.start)));
          spans.add(TextSpan(text: match.group(1), style: const TextStyle(fontWeight: FontWeight.bold)));
          lastEnd = match.end;
        }
        if (lastEnd < trimmed.length) spans.add(TextSpan(text: trimmed.substring(lastEnd)));

        // Bullet points
        final isBullet = trimmed.startsWith('•') || trimmed.startsWith('- ') || RegExp(r'^\d+\.').hasMatch(trimmed);

        return Padding(
          padding: EdgeInsets.only(bottom: 3, left: isBullet ? 4 : 0),
          child: RichText(text: TextSpan(style: TextStyle(color: color, fontSize: 14, height: 1.5), children: spans.isEmpty ? [TextSpan(text: trimmed)] : spans)),
        );
      }).toList(),
    );
  }
}
