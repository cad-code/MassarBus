// lib/screens/home_screen.dart
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:ui'; 
import 'package:shared_preferences/shared_preferences.dart';
import 'package:firebase_messaging/firebase_messaging.dart'; 

import 'map_screen.dart'; 
import 'notification_screen.dart'; 
import 'history_screen.dart';
import 'profile_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  bool _isLoading = true;
  List<dynamic> _children = [];
  int _selectedIndex = 0; 

  final String apiUrl = 'http://192.168.42.115:5000/api/students/my-children';
  final String baseUrl = 'http://192.168.42.115:5000/api'; 

  final Color accentOrange = const Color(0xFFF59E0B);
  final Color accentBlue = const Color(0xFF3B82F6);

  @override
  void initState() {
    super.initState();
    _setupPushNotifications(); 
    _fetchChildren();
  }

  Future<void> _setupPushNotifications() async {
    FirebaseMessaging messaging = FirebaseMessaging.instance;
    NotificationSettings settings = await messaging.requestPermission();
    
    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      String? token = await messaging.getToken();
      
      if (token != null) {
        try {
          final prefs = await SharedPreferences.getInstance();
          final userToken = prefs.getString('massarbus_token');

          final response = await http.put(
            Uri.parse('$baseUrl/users/update-fcm-token'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $userToken',
            },
            body: json.encode({'fcmToken': token}),
          );

          if (response.statusCode == 200) {
            print("✅ Token FCM envoyé et sauvegardé en BDD !");
          } else {
            print("🔴 Le serveur a refusé le Token : ${response.body}");
          }
        } catch (e) {
          print("🔴 Erreur réseau lors de l'envoi du Token FCM : $e");
        }
      }
    }
  }

  Future<void> _fetchChildren() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('massarbus_token');

      final response = await http.get(
        Uri.parse(apiUrl),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        setState(() {
          _children = json.decode(response.body)['children'] ?? json.decode(response.body);
          _isLoading = false;
        });
      } else {
        setState(() => _isLoading = false);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Erreur lors du chargement des enfants.')),
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

  Future<void> _toggleAbsence(String studentId, bool currentStatus, int index) async {
    setState(() {
      _children[index]['isAbsentToday'] = !currentStatus;
    });

    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('massarbus_token');

      final response = await http.put(
        Uri.parse('$baseUrl/students/$studentId/attendance'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: json.encode({
          'isAbsentToday': !currentStatus,
        }),
      );

      if (response.statusCode == 200) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(!currentStatus ? 'Absence signalée au chauffeur 🔴' : 'Présence confirmée 🟢'),
            backgroundColor: !currentStatus ? Colors.redAccent : Colors.green,
            duration: const Duration(seconds: 2),
          ),
        );
      } else {
        setState(() {
          _children[index]['isAbsentToday'] = currentStatus;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Erreur serveur lors de la mise à jour.')),
        );
      }
    } catch (e) {
      setState(() {
        _children[index]['isAbsentToday'] = currentStatus;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Erreur de connexion.')),
      );
    }
  }

  Future<void> _logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('massarbus_token');
    if (!mounted) return;
    Navigator.pushReplacementNamed(context, '/login'); 
  }

  // Gestion de la navigation du bas
  void _onItemTapped(int index) {
    if (index == 1) {
      Navigator.push(
        context,
        MaterialPageRoute(builder: (context) => const NotificationScreen()),
      );
    } else if (index == 2) {
      // Rediriger vers le nouvel écran de profil !
      Navigator.push(
        context,
        MaterialPageRoute(builder: (context) => const ProfileScreen()),
      );
    } else {
      setState(() {
        _selectedIndex = index;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBodyBehindAppBar: true, 
      extendBody: true, 
      
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          boxShadow: [
            BoxShadow(color: Colors.black.withOpacity(0.5), blurRadius: 20, offset: const Offset(0, -5)),
          ],
        ),
        child: ClipRRect(
          borderRadius: const BorderRadius.vertical(top: Radius.circular(30)),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 15, sigmaY: 15),
            child: BottomNavigationBar(
              backgroundColor: const Color(0xFF0B1120).withOpacity(0.85),
              selectedItemColor: accentOrange,
              unselectedItemColor: Colors.white54,
              showUnselectedLabels: true,
              currentIndex: _selectedIndex,
              onTap: _onItemTapped,
              type: BottomNavigationBarType.fixed,
              elevation: 0,
              items: const [
                BottomNavigationBarItem(icon: Icon(Icons.dashboard_rounded), label: 'Accueil'),
                BottomNavigationBarItem(icon: Icon(Icons.notifications_rounded), label: 'Alertes'),
                BottomNavigationBarItem(icon: Icon(Icons.person_rounded), label: 'Profil'),
              ],
            ),
          ),
        ),
      ),

      body: Stack(
        fit: StackFit.expand,
        children: [
          Image.asset(
            'assets/bg_homescreen.png',
            fit: BoxFit.cover,
            alignment: Alignment.center,
          ),

          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  const Color(0xFF0B1120).withOpacity(0.7),
                  const Color(0xFF0B1120).withOpacity(0.3),
                  const Color(0xFF0B1120).withOpacity(0.8),
                ],
                stops: const [0.0, 0.4, 1.0],
              ),
            ),
          ),

          SafeArea(
            bottom: false,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 20.0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'MassarBus',
                            style: TextStyle(color: accentOrange, fontSize: 14, fontWeight: FontWeight.bold, letterSpacing: 2),
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'Mes Enfants',
                            style: TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.w900),
                          ),
                        ],
                      ),
                      CircleAvatar(
                        radius: 24,
                        backgroundColor: accentBlue.withOpacity(0.2),
                        child: Icon(Icons.family_restroom_rounded, color: accentBlue, size: 24),
                      )
                    ],
                  ),
                ),

                // LISTE DES ENFANTS
                Expanded(
                  child: _isLoading
                      ? Center(child: CircularProgressIndicator(color: accentOrange))
                      : _children.isEmpty
                          ? Center(
                              child: Container(
                                padding: const EdgeInsets.all(20),
                                decoration: BoxDecoration(
                                  color: Colors.black.withOpacity(0.5),
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: const Text(
                                  'Aucun enfant associé à ce compte.',
                                  style: TextStyle(color: Colors.white70, fontSize: 16),
                                ),
                              ),
                            )
                          : RefreshIndicator(
                              onRefresh: _fetchChildren,
                              color: accentOrange,
                              backgroundColor: const Color(0xFF0B1120),
                              child: ListView.builder(
                                padding: const EdgeInsets.only(left: 20, right: 20, bottom: 100, top: 10), // Padding bas pour la nav bar
                                itemCount: _children.length,
                                itemBuilder: (context, index) {
                                  return _buildChildCard(_children[index], index);
                                },
                              ),
                            ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // CARTE ENFANT STYLE GLASSMORPHISM
  Widget _buildChildCard(Map<String, dynamic> child, int index) {
    final childName = child['name'] ?? child['firstName'] ?? 'Enfant inconnu';
    final isAbsent = child['isAbsentToday'] ?? false;
    final isOnBus = child['status'] == 'ON_BUS' || child['status'] == 'BOARDED'; 

    return Padding(
      padding: const EdgeInsets.only(bottom: 20.0),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10), 
          child: Container(
            decoration: BoxDecoration(
              color: const Color(0xFF0B1120).withOpacity(0.6), 
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: Colors.white.withOpacity(0.1), width: 1.5), 
            ),
            padding: const EdgeInsets.all(20.0),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: isAbsent ? Colors.redAccent.withOpacity(0.2) : accentBlue.withOpacity(0.2),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              isAbsent ? Icons.person_off_rounded : Icons.person_rounded, 
                              color: isAbsent ? Colors.redAccent : accentBlue, 
                              size: 28
                            ),
                          ),
                          const SizedBox(width: 16),
                          // Infos
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  childName,
                                  style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 6),
                                Row(
                                  children: [
                                    Container(
                                      width: 10, height: 10,
                                      decoration: BoxDecoration(
                                        color: isAbsent ? Colors.redAccent : (isOnBus ? Colors.greenAccent : Colors.grey),
                                        shape: BoxShape.circle,
                                        boxShadow: [
                                          BoxShadow(
                                            color: isAbsent ? Colors.redAccent.withOpacity(0.5) : (isOnBus ? Colors.greenAccent.withOpacity(0.5) : Colors.transparent),
                                            blurRadius: 8
                                          )
                                        ]
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      isAbsent ? 'Absent aujourd\'hui' : (isOnBus ? 'En route' : 'En attente du bus'),
                                      style: TextStyle(
                                        color: isAbsent ? Colors.redAccent : (isOnBus ? Colors.greenAccent : Colors.white70),
                                        fontWeight: FontWeight.w600,
                                        fontSize: 13,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    
                    Column(
                      children: [
                        Text('Absent', style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 11, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 4),
                        Switch(
                          value: isAbsent,
                          activeColor: Colors.white,
                          activeTrackColor: Colors.redAccent,
                          inactiveThumbColor: Colors.grey.shade400,
                          inactiveTrackColor: Colors.black.withOpacity(0.5),
                          onChanged: (bool value) => _toggleAbsence(child['_id'], isAbsent, index),
                        ),
                      ],
                    ),
                  ],
                ),
                
                const SizedBox(height: 24),
                
                Row(
                  children: [
                    Expanded(
                      flex: 2,
                      child: Container(
                        height: 50,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(16),
                          gradient: LinearGradient(
                            colors: isAbsent ? [Colors.grey.shade800, Colors.grey.shade900] : [accentOrange, const Color(0xFFD97706)],
                          ),
                          boxShadow: isAbsent ? [] : [
                            BoxShadow(color: accentOrange.withOpacity(0.4), blurRadius: 12, offset: const Offset(0, 4))
                          ],
                        ),
                        child: ElevatedButton(
                          onPressed: isAbsent ? null : () async {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Recherche du bus en cours...'), duration: Duration(seconds: 1)),
                            );

                            try {
                              final prefs = await SharedPreferences.getInstance();
                              final token = prefs.getString('massarbus_token');
                              
                              final String routeId = child['routeId'] is Map ? child['routeId']['_id'] : child['routeId'];
                              
                              final response = await http.get(
                                Uri.parse('$baseUrl/trips/active/$routeId'),
                                headers: { 'Authorization': 'Bearer $token' },
                              );

                              if (response.statusCode == 200) {
                                final data = json.decode(response.body);
                                final activeTripId = data['tripId'];

                                double stopLat = 33.9964; 
                                double stopLng = -4.9917; 
                                
                                if (child['pickupStop'] != null) {
                                  final stop = child['pickupStop'];
                                  try {
                                    if (stop['location'] != null && stop['location']['coordinates'] != null) {
                                      stopLng = (stop['location']['coordinates'][0] as num).toDouble();
                                      stopLat = (stop['location']['coordinates'][1] as num).toDouble();
                                    } else if (stop['lat'] != null || stop['latitude'] != null) {
                                      stopLat = ((stop['lat'] ?? stop['latitude']) as num).toDouble();
                                      stopLng = ((stop['lng'] ?? stop['longitude']) as num).toDouble();
                                    }
                                  } catch (e) {
                                    print("🔴 Erreur coordonnées : $e");
                                  }
                                }

                                if (mounted) {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (context) => MapScreen(
                                        studentId: child['_id'],
                                        tripId: activeTripId,
                                        stopLat: stopLat,
                                        stopLng: stopLng, 
                                      ),
                                    ),
                                  );
                                }
                              } else {
                                if (mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(content: Text('Le bus n\'a pas encore démarré.'), backgroundColor: Colors.orange),
                                  );
                                }
                              }
                            } catch (e) {
                              if (mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Erreur de connexion au serveur.')),
                                );
                              }
                            }
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.transparent,
                            shadowColor: Colors.transparent,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          ),
                          child: const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.location_on_rounded, color: Colors.white, size: 20),
                              SizedBox(width: 8),
                              Text('SUIVRE LE BUS', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13, letterSpacing: 0.5)),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    
                    Expanded(
                      flex: 1,
                      child: Container(
                        height: 50,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(16),
                          color: Colors.white.withOpacity(0.1),
                          border: Border.all(color: Colors.white.withOpacity(0.2)),
                        ),
                        child: ElevatedButton(
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => HistoryScreen(studentId: child['_id'], studentName: childName),
                              ),
                            );
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.transparent,
                            shadowColor: Colors.transparent,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          ),
                          child: const Icon(Icons.history_rounded, color: Colors.white, size: 24),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}