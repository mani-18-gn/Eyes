import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

enum SyncOperation { saveMemory, addExpense, createTask, recordScan }

class SyncQueueItem {
  final String id;
  final SyncOperation operation;
  final Map<String, dynamic> payload;
  final DateTime createdAt;
  int retryCount;

  SyncQueueItem({
    required this.id,
    required this.operation,
    required this.payload,
    required this.createdAt,
    this.retryCount = 0,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'operation': operation.index,
    'payload': payload,
    'createdAt': createdAt.toIso8601String(),
    'retryCount': retryCount,
  };

  factory SyncQueueItem.fromJson(Map<String, dynamic> json) => SyncQueueItem(
    id: json['id'],
    operation: SyncOperation.values[json['operation']],
    payload: json['payload'],
    createdAt: DateTime.parse(json['createdAt']),
    retryCount: json['retryCount'] ?? 0,
  );
}

class MobileSyncManager {
  static const String _queueKey = 'realitylens_offline_sync_queue';

  Future<void> enqueue(SyncOperation op, Map<String, dynamic> payload) async {
    final prefs = await SharedPreferences.getInstance();
    final items = await getQueue();
    final newItem = SyncQueueItem(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      operation: op,
      payload: payload,
      createdAt: DateTime.now(),
    );
    items.add(newItem);
    final encoded = jsonEncode(items.map((i) => i.toJson()).toList());
    await prefs.setString(_queueKey, encoded);
  }

  Future<List<SyncQueueItem>> getQueue() async {
    final prefs = await SharedPreferences.getInstance();
    final data = prefs.getString(_queueKey);
    if (data == null || data.isEmpty) return [];
    try {
      final List decoded = jsonDecode(data);
      return decoded.map((e) => SyncQueueItem.fromJson(e)).toList();
    } catch (e) {
      return [];
    }
  }

  Future<void> syncAll(Function(SyncQueueItem item) syncHandler) async {
    final items = await getQueue();
    if (items.isEmpty) return;

    final List<SyncQueueItem> remaining = [];
    for (final item in items) {
      try {
        await syncHandler(item);
      } catch (e) {
        item.retryCount += 1;
        if (item.retryCount < 5) {
          remaining.add(item);
        }
      }
    }

    final prefs = await SharedPreferences.getInstance();
    final encoded = jsonEncode(remaining.map((i) => i.toJson()).toList());
    await prefs.setString(_queueKey, encoded);
  }
}
