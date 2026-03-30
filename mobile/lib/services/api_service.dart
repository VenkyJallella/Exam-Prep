import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiService {
  // Change this to your backend URL
  // Production: https://zencodio.com/api/v1
  // Dev emulator: http://10.0.2.2:8000/api/v1
  static const String baseUrl = 'https://zencodio.com/api/v1';

  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  String? _accessToken;
  String? _refreshToken;

  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  Future<void> loadTokens() async {
    _accessToken = await _storage.read(key: 'access_token');
    _refreshToken = await _storage.read(key: 'refresh_token');
  }

  Future<void> saveTokens(String access, String refresh) async {
    _accessToken = access;
    _refreshToken = refresh;
    await _storage.write(key: 'access_token', value: access);
    await _storage.write(key: 'refresh_token', value: refresh);
  }

  Future<void> clearTokens() async {
    _accessToken = null;
    _refreshToken = null;
    await _storage.deleteAll();
  }

  bool get isLoggedIn => _accessToken != null;

  Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    if (_accessToken != null) 'Authorization': 'Bearer $_accessToken',
  };

  Future<Map<String, dynamic>> get(String path) async {
    var response = await http.get(Uri.parse('$baseUrl$path'), headers: _headers);

    if (response.statusCode == 401 && _refreshToken != null) {
      await _tryRefresh();
      response = await http.get(Uri.parse('$baseUrl$path'), headers: _headers);
    }

    return _handleResponse(response);
  }

  Future<Map<String, dynamic>> post(String path, [Map<String, dynamic>? body]) async {
    var response = await http.post(
      Uri.parse('$baseUrl$path'),
      headers: _headers,
      body: body != null ? jsonEncode(body) : null,
    );

    if (response.statusCode == 401 && _refreshToken != null) {
      await _tryRefresh();
      response = await http.post(
        Uri.parse('$baseUrl$path'),
        headers: _headers,
        body: body != null ? jsonEncode(body) : null,
      );
    }

    return _handleResponse(response);
  }

  Future<void> _tryRefresh() async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/refresh'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'refresh_token': _refreshToken}),
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body)['data'];
        await saveTokens(data['access_token'], data['refresh_token']);
      } else {
        await clearTokens();
      }
    } catch (_) {
      await clearTokens();
    }
  }

  Map<String, dynamic> _handleResponse(http.Response response) {
    final body = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return body;
    }
    throw ApiException(
      body['error']?['message'] ?? 'Something went wrong',
      body['error']?['code'] ?? 'UNKNOWN',
      response.statusCode,
    );
  }
}

class ApiException implements Exception {
  final String message;
  final String code;
  final int statusCode;
  ApiException(this.message, this.code, this.statusCode);
  @override
  String toString() => message;
}
