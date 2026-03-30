import 'package:flutter/material.dart';
import '../services/api_service.dart';

class AuthProvider extends ChangeNotifier {
  final ApiService _api = ApiService();
  bool _isLoading = true;
  bool _isLoggedIn = false;
  Map<String, dynamic>? _user;

  bool get isLoading => _isLoading;
  bool get isLoggedIn => _isLoggedIn;
  Map<String, dynamic>? get user => _user;

  Future<void> init() async {
    await _api.loadTokens();
    if (_api.isLoggedIn) {
      try {
        final res = await _api.get('/users/me');
        _user = res['data'];
        _isLoggedIn = true;
      } catch (_) {
        await _api.clearTokens();
        _isLoggedIn = false;
      }
    }
    _isLoading = false;
    notifyListeners();
  }

  Future<void> login(String email, String password) async {
    final res = await _api.post('/auth/login', {'email': email, 'password': password});
    await _api.saveTokens(res['data']['access_token'], res['data']['refresh_token']);
    final userRes = await _api.get('/users/me');
    _user = userRes['data'];
    _isLoggedIn = true;
    notifyListeners();
  }

  Future<void> register(String name, String email, String password) async {
    await _api.post('/auth/register', {'full_name': name, 'email': email, 'password': password});
  }

  Future<String> sendOtp(String email) async {
    final res = await _api.post('/auth/send-otp', {'email': email});
    return res['data']['otp'] ?? '';
  }

  Future<void> verifyOtp(String email, String otp) async {
    await _api.post('/auth/verify-otp', {'email': email, 'otp': otp});
  }

  Future<void> logout() async {
    try { await _api.post('/auth/logout'); } catch (_) {}
    await _api.clearTokens();
    _user = null;
    _isLoggedIn = false;
    notifyListeners();
  }
}
