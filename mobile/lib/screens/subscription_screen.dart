import 'package:flutter/material.dart';
import '../services/api_service.dart';

class SubscriptionScreen extends StatefulWidget {
  const SubscriptionScreen({super.key});
  @override
  State<SubscriptionScreen> createState() => _SubscriptionScreenState();
}

class _SubscriptionScreenState extends State<SubscriptionScreen> {
  final _api = ApiService();
  Map<String, dynamic>? _usage;
  bool _loading = true;
  bool _upgrading = false;
  String get currentPlan => _usage?['plan'] ?? 'free';

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    try {
      final res = await _api.get('/payments/usage');
      if (mounted) setState(() { _usage = res['data']; _loading = false; });
    } catch (_) { if (mounted) setState(() => _loading = false); }
  }

  Future<void> _upgrade(String plan) async {
    setState(() => _upgrading = true);
    try {
      final orderRes = await _api.post('/payments/orders', {'plan': plan});
      final paymentId = orderRes['data']['payment_id'];
      await _api.post('/payments/verify', {'payment_id': paymentId});
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Upgraded to ${plan[0].toUpperCase()}${plan.substring(1)}!'), backgroundColor: Colors.green));
      _load();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e'), backgroundColor: Colors.red));
    } finally { if (mounted) setState(() => _upgrading = false); }
  }

  @override
  Widget build(BuildContext context) {
    final currentPlan = _usage?['plan'] ?? 'free';

    return Scaffold(
      appBar: AppBar(title: const Text('Subscription'), centerTitle: true, backgroundColor: Colors.white, elevation: 0),
      backgroundColor: const Color(0xFFF8F9FC),
      body: _loading ? const Center(child: CircularProgressIndicator()) : SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(children: [
          // Current plan card
          Container(
            width: double.infinity, padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [Color(0xFF4F46E5), Color(0xFF7C3AED)]),
              borderRadius: BorderRadius.circular(20),
              boxShadow: [BoxShadow(color: const Color(0xFF4F46E5).withOpacity(0.3), blurRadius: 12, offset: const Offset(0, 6))],
            ),
            child: Column(children: [
              const Text('Current Plan', style: TextStyle(color: Colors.white70, fontSize: 13)),
              const SizedBox(height: 4),
              Text(currentPlan.toUpperCase(), style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold)),
              if (_usage?['usage_today'] != null) ...[
                const SizedBox(height: 8),
                Text('${_usage!['usage_today']['sessions']}/${_usage!['usage_today']['sessions_limit'] == 999 ? '∞' : _usage!['usage_today']['sessions_limit']} sessions today', style: const TextStyle(color: Colors.white70, fontSize: 12)),
              ],
            ]),
          ),
          const SizedBox(height: 20),

          // Plans
          _planCard('Free', 'Free', [
            '10 sessions/day', '50 Q/session', 'Daily Quiz', 'All coding', '30-day analytics', 'AI chatbot (5/day)',
          ], currentPlan == 'free', false, () {}),
          const SizedBox(height: 12),

          _planCard('Pro', '₹149/mo', [
            'Unlimited sessions', 'AI question generation', 'AI explanations', 'All mock tests', '90-day analytics', 'AI chatbot (50/day)', 'Ad-free',
          ], currentPlan == 'pro', true, () => _upgrade('pro')),
          const SizedBox(height: 12),

          _planCard('Premium', '₹199/mo', [
            'Everything in Pro', 'Topper comparison', 'PDF export', '1-year analytics', 'Unlimited AI chatbot', 'Priority support',
          ], currentPlan == 'premium', false, () => _upgrade('premium')),
        ]),
      ),
    );
  }

  Widget _planCard(String name, String price, List<String> features, bool isCurrent, bool isPopular, VoidCallback onUpgrade) {
    return Container(
      width: double.infinity, padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white, borderRadius: BorderRadius.circular(20),
        border: isCurrent ? Border.all(color: const Color(0xFF4F46E5), width: 2) : isPopular ? Border.all(color: const Color(0xFF4F46E5).withOpacity(0.3), width: 1.5) : null,
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 8)],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Text(name, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(width: 8),
          if (isCurrent) Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2), decoration: BoxDecoration(color: Colors.green[50], borderRadius: BorderRadius.circular(10)), child: Text('Current', style: TextStyle(color: Colors.green[700], fontSize: 11, fontWeight: FontWeight.bold))),
          if (isPopular && !isCurrent) Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2), decoration: BoxDecoration(color: const Color(0xFF4F46E5).withOpacity(0.1), borderRadius: BorderRadius.circular(10)), child: const Text('Popular', style: TextStyle(color: Color(0xFF4F46E5), fontSize: 11, fontWeight: FontWeight.bold))),
          const Spacer(),
          Text(price, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        ]),
        const SizedBox(height: 12),
        ...features.map((f) => Padding(
          padding: const EdgeInsets.only(bottom: 6),
          child: Row(children: [
            Icon(Icons.check_circle, color: Colors.green[400], size: 16),
            const SizedBox(width: 8),
            Text(f, style: TextStyle(color: Colors.grey[700], fontSize: 13)),
          ]),
        )),
        if (!isCurrent && name == 'Free' && currentPlan != 'free') ...[
          const SizedBox(height: 12),
          SizedBox(width: double.infinity, height: 46, child: OutlinedButton(
            onPressed: _upgrading ? null : () async {
              final confirmed = await showDialog<bool>(context: context, builder: (c) => AlertDialog(
                title: const Text('Switch to Free?'), content: const Text('You will lose access to premium features.'),
                actions: [TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Cancel')), TextButton(onPressed: () => Navigator.pop(c, true), child: const Text('Switch', style: TextStyle(color: Colors.red)))],
              ));
              if (confirmed != true) return;
              try { await _api.post('/payments/cancel'); _load(); if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Switched to Free'), backgroundColor: Colors.green)); } catch (e) { if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e'))); }
            },
            style: OutlinedButton.styleFrom(side: const BorderSide(color: Colors.grey), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
            child: const Text('Switch to Free', style: TextStyle(fontWeight: FontWeight.bold)),
          )),
        ],
        if (!isCurrent && name != 'Free') ...[
          const SizedBox(height: 12),
          SizedBox(width: double.infinity, height: 46, child: ElevatedButton(
            onPressed: _upgrading ? null : onUpgrade,
            style: ElevatedButton.styleFrom(
              backgroundColor: name == 'Premium' ? Colors.purple : const Color(0xFF4F46E5),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
            child: Text(_upgrading ? 'Processing...' : 'Upgrade to $name', style: const TextStyle(fontWeight: FontWeight.bold)),
          )),
        ],
      ]),
    );
  }
}
