import 'package:flutter/material.dart';
import '../services/api_service.dart';

class ScheduledTestsScreen extends StatefulWidget {
  const ScheduledTestsScreen({super.key});
  @override
  State<ScheduledTestsScreen> createState() => _ScheduledTestsScreenState();
}

class _ScheduledTestsScreenState extends State<ScheduledTestsScreen> {
  final _api = ApiService();
  List<dynamic> _tests = [];
  bool _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    try {
      final r = await _api.get('/tests');
      if (mounted) setState(() { _tests = (r['data'] as List).where((t) => t['is_scheduled'] == true && t['scheduled_at'] != null).toList(); _loading = false; });
    } catch (_) { if (mounted) setState(() => _loading = false); }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Scheduled Tests'), centerTitle: true),
      body: _loading ? const Center(child: CircularProgressIndicator())
        : _tests.isEmpty ? const Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [Icon(Icons.schedule, size: 64, color: Colors.grey), SizedBox(height: 16), Text('No scheduled tests', style: TextStyle(fontSize: 18, color: Colors.grey)), SizedBox(height: 4), Text('Check back later', style: TextStyle(color: Colors.grey))]))
        : ListView.builder(padding: const EdgeInsets.all(16), itemCount: _tests.length, itemBuilder: (c, i) {
          final t = _tests[i];
          final scheduledAt = DateTime.tryParse(t['scheduled_at'] ?? '');
          final canJoin = scheduledAt != null && DateTime.now().isAfter(scheduledAt);
          return Container(margin: const EdgeInsets.only(bottom: 12), padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: canJoin ? Border.all(color: Colors.green[300]!, width: 1.5) : null),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(t['title'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              const SizedBox(height: 6),
              Row(children: [
                Icon(Icons.calendar_today, size: 14, color: Colors.grey[500]),
                const SizedBox(width: 4),
                Text(scheduledAt?.toString().substring(0, 16) ?? '', style: TextStyle(color: Colors.grey[500], fontSize: 12)),
                const SizedBox(width: 12),
                Text('${t['duration_minutes']}min · ${t['total_marks']} marks', style: TextStyle(color: Colors.grey[500], fontSize: 12)),
              ]),
              const SizedBox(height: 10),
              SizedBox(width: double.infinity, child: ElevatedButton(onPressed: canJoin ? () {} : null,
                style: ElevatedButton.styleFrom(backgroundColor: canJoin ? Colors.green : Colors.grey[300], foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                child: Text(canJoin ? 'Join Now' : 'Waiting...', style: const TextStyle(fontWeight: FontWeight.bold)))),
            ]),
          );
        }),
    );
  }
}
