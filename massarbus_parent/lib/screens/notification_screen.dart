// lib/screens/notification_screen.dart
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:ui'; 
import 'package:shared_preferences/shared_preferences.dart';

class NotificationScreen extends StatefulWidget {
  const NotificationScreen({Key? key}) : super(key: key);

  @override
  _NotificationScreenState createState() => _NotificationScreenState();
}

class _NotificationScreenState extends State<NotificationScreen> {
  bool _isLoading = true;
  List<dynamic> notifications = [];

  final String baseUrl = 'http://192.168.42.115:5000/api'; 

  @override
  void initState() {
    super.initState();
    _fetchNotifications();
  }

  Future<void> _fetchNotifications() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('massarbus_token');

      final response = await http.get(
        Uri.parse('$baseUrl/notifications'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        setState(() {
          notifications = data['notifications'] ?? [];
          _isLoading = false;
        });
      } else {
        setState(() => _isLoading = false);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Erreur lors du chargement des notifications.')),
          );
        }
      }
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Erreur réseau.')),
        );
      }
    }
  }

  Future<void> _markAsRead(String id, int index) async {
    if (notifications[index]['isRead']) return;

    setState(() {
      notifications[index]['isRead'] = true;
    });

    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('massarbus_token');

      await http.put(
        Uri.parse('$baseUrl/notifications/$id/read'),
        headers: {
          'Authorization': 'Bearer $token',
        },
      );
    } catch (e) {
      debugPrint("Erreur lors de la mise à jour : $e");
      setState(() {
        notifications[index]['isRead'] = false;
      });
    }
  }

  Future<void> _clearAllNotifications() async {
    final bool? confirm = await showDialog<bool>(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          backgroundColor: const Color(0xFF1E293B),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Row(
            children: [
              Icon(Icons.delete_sweep_rounded, color: Colors.redAccent),
              SizedBox(width: 10),
              Text('Tout supprimer ?', style: TextStyle(color: Colors.white)),
            ],
          ),
          content: const Text(
            'Voulez-vous vraiment effacer toutes vos notifications ?',
            style: TextStyle(color: Colors.white70),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Annuler', style: TextStyle(color: Colors.grey)),
            ),
            ElevatedButton(
              onPressed: () => Navigator.of(context).pop(true),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.redAccent,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              child: const Text('Supprimer', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
          ],
        );
      },
    );

    if (confirm == true) {
      try {
        final prefs = await SharedPreferences.getInstance();
        final token = prefs.getString('massarbus_token');

        final response = await http.delete(
          Uri.parse('$baseUrl/notifications/clear-all'),
          headers: {
            'Authorization': 'Bearer $token',
          },
        );

        if (response.statusCode == 200) {
          setState(() {
            notifications.clear();
          });
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Notifications supprimées '), backgroundColor: Colors.green),
            );
          }
        } else {
          throw Exception("Erreur serveur");
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Erreur lors de la suppression.'), backgroundColor: Colors.redAccent),
          );
        }
      }
    }
  }

  Map<String, dynamic> _getNotificationStyle(String type) {
    switch (type) {
      case 'BOARDED':
        return {'color': Colors.greenAccent, 'icon': Icons.directions_bus_rounded};
      case 'DROPPED':
        return {'color': Colors.blueAccent, 'icon': Icons.school_rounded};
      case 'APPROACHING':
        return {'color': Colors.orangeAccent, 'icon': Icons.radar_rounded};
      case 'DELAY':
        return {'color': Colors.amberAccent, 'icon': Icons.timer_rounded};
      case 'EMERGENCY':
        return {'color': Colors.redAccent, 'icon': Icons.warning_rounded};
      case 'INFO':
      default:
        return {'color': Colors.grey.shade400, 'icon': Icons.info_outline_rounded};
    }
  }

  String _formatDate(String isoString) {
    DateTime date = DateTime.parse(isoString).toLocal();
    final now = DateTime.now();
    
    if (date.year == now.year && date.month == now.month && date.day == now.day) {
      return "Aujourd'hui à ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}";
    }
    
    return "${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')} à ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}";
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBodyBehindAppBar: true, 
      backgroundColor: const Color(0xFF0B1120),
      
      appBar: AppBar(
        title: const Text('Notifications', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
        actions: [
          if (notifications.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.delete_sweep_rounded, color: Colors.redAccent),
              onPressed: _clearAllNotifications,
              tooltip: 'Tout supprimer',
            ),
        ],
        flexibleSpace: ClipRRect(
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 15, sigmaY: 15),
            child: Container(color: const Color(0xFF0B1120).withOpacity(0.6)),
          ),
        ),
      ),
      
      body: Stack(
        fit: StackFit.expand,
        children: [
          Image.asset(
            'assets/histrory_bg.png', 
            fit: BoxFit.cover,
            alignment: Alignment.center,
          ),

          Container(
            color: const Color(0xFF0B1120).withOpacity(0.85), 
          ),

          _isLoading
              ? const Center(child: CircularProgressIndicator(color: Colors.blueAccent))
              : notifications.isEmpty
                  ? Center(
                      child: Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: Colors.black.withOpacity(0.5),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: const Text(
                          "Aucune notification pour le moment.",
                          style: TextStyle(fontSize: 16, color: Colors.white70),
                        ),
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _fetchNotifications,
                      color: Colors.blueAccent,
                      backgroundColor: const Color(0xFF1E293B),
                      child: ListView.builder(
                        padding: const EdgeInsets.only(top: 120, left: 20, right: 20, bottom: 40),
                        itemCount: notifications.length,
                        itemBuilder: (context, index) {
                          final notif = notifications[index];
                          final bool isRead = notif['isRead'] ?? false;
                          final style = _getNotificationStyle(notif['type'] ?? 'INFO');
                          final Color notifColor = style['color'];

                          return GestureDetector(
                            onTap: () => _markAsRead(notif['_id'], index),
                            child: Container(
                              margin: const EdgeInsets.only(bottom: 12),
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(16),
                                child: BackdropFilter(
                                  filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                                  child: AnimatedContainer(
                                    duration: const Duration(milliseconds: 300),
                                    padding: const EdgeInsets.all(16),
                                    decoration: BoxDecoration(
                                      color: isRead 
                                          ? const Color(0xFF1E293B).withOpacity(0.3) 
                                          : const Color(0xFF1E293B).withOpacity(0.7),
                                      borderRadius: BorderRadius.circular(16),
                                      border: Border.all(
                                        color: isRead ? Colors.transparent : notifColor.withOpacity(0.5),
                                        width: 1.5,
                                      ),
                                    ),
                                    child: Row(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.all(12),
                                          decoration: BoxDecoration(
                                            color: notifColor.withOpacity(0.2),
                                            shape: BoxShape.circle,
                                          ),
                                          child: Icon(style['icon'], color: notifColor, size: 24),
                                        ),
                                        const SizedBox(width: 16),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Row(
                                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                                children: [
                                                  Expanded(
                                                    child: Text(
                                                      notif['title'] ?? 'Alerte MassarBus',
                                                      style: TextStyle(
                                                        color: Colors.white,
                                                        fontWeight: isRead ? FontWeight.w600 : FontWeight.w900,
                                                        fontSize: 16,
                                                      ),
                                                    ),
                                                  ),
                                                  if (!isRead)
                                                    Container(
                                                      width: 10,
                                                      height: 10,
                                                      margin: const EdgeInsets.only(left: 8),
                                                      decoration: const BoxDecoration(
                                                        color: Colors.redAccent,
                                                        shape: BoxShape.circle,
                                                      ),
                                                    ),
                                                ],
                                              ),
                                              const SizedBox(height: 6),
                                              Text(
                                                notif['message'] ?? '',
                                                style: TextStyle(
                                                  color: isRead ? Colors.white54 : Colors.white70,
                                                  height: 1.4,
                                                ),
                                              ),
                                              const SizedBox(height: 10),
                                              Text(
                                                _formatDate(notif['createdAt']),
                                                style: TextStyle(
                                                  fontSize: 12, 
                                                  color: isRead ? Colors.white38 : notifColor.withOpacity(0.8),
                                                  fontWeight: FontWeight.w600,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
        ],
      ),
    );
  }
}