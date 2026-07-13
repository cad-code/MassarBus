// lib/screens/trip_selection_screen.dart
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'dashboard_screen.dart';

class TripSelectionScreen extends StatefulWidget {
  const TripSelectionScreen({super.key});

  @override
  State<TripSelectionScreen> createState() => _TripSelectionScreenState();
}

class _TripSelectionScreenState extends State<TripSelectionScreen> {
  bool _isLoading = true;
  List<dynamic> _trips = [];
  String _errorMessage = '';

  final Color bgDark = const Color(0xFF0B1120); 
  final Color bgCard = const Color(0xFF1E293B);
  final Color accentOrange = const Color(0xFFF59E0B);
  final Color accentBlue = const Color(0xFF3B82F6);

  @override
  void initState() {
    super.initState();
    _fetchTrips();
  }

  Future<void> _fetchTrips() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('massarbus_token');

      final url = Uri.parse('http://192.168.42.115:5000/api/trips');
      final response = await http.get(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token', 
          'x-auth-token': token ?? '', 
        },
      );

      if (response.statusCode == 200) {
        if (mounted) {
          setState(() {
            _trips = json.decode(response.body);
            _isLoading = false;
          });
        }
      } else {
        if (mounted) {
          setState(() {
            _errorMessage = 'Erreur serveur. Impossible de charger les trajets.';
            _isLoading = false;
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Impossible de contacter le serveur.';
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: bgDark,
      appBar: AppBar(
        title: const Text('Mes Trajets Assignés', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
      ),
      body: Stack(
        children: [
          // Lueur de fond discrète
          Positioned(
            top: 50,
            right: -50,
            child: Container(
              width: 200,
              height: 200,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [accentOrange.withOpacity(0.1), Colors.transparent],
                ),
              ),
            ),
          ),
          
          SafeArea(
            child: _isLoading
                ? Center(child: CircularProgressIndicator(color: accentBlue))
                : _errorMessage.isNotEmpty
                    ? _buildErrorState()
                    : _trips.isEmpty
                        ? _buildEmptyState()
                        : ListView.builder(
                            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                            physics: const BouncingScrollPhysics(),
                            itemCount: _trips.length,
                            itemBuilder: (context, index) {
                              final trip = _trips[index];
                              
                              final routeData = trip['routeId'] ?? trip['route']; 
                              final routeName = routeData?['name'] ?? routeData?['routeName'] ?? 'Trajet Inconnu';
                              
                              final busData = trip['busId'] ?? trip['bus'];
                              final busId = busData?['_id'] ?? 'BUS_INCONNU';
                              final tripId = trip['_id'];
                              final studentsCount = trip['students']?.length ?? 0;

                              return _buildTripCard(routeName, studentsCount, tripId, busId);
                            },
                          ),
          ),
        ],
      ),
    );
  }

  Widget _buildTripCard(String routeName, int studentsCount, String tripId, String busId) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: bgCard,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 15, offset: const Offset(0, 8)),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          highlightColor: accentBlue.withOpacity(0.1),
          splashColor: accentBlue.withOpacity(0.2),
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => DashboardScreen(
                  tripId: tripId,
                  busId: busId,
                  routeName: routeName,
                ),
              ),
            );
          },
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: accentBlue.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(30),
                      ),
                      child: Text('EN ATTENTE', style: TextStyle(color: accentBlue, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1)),
                    ),
                    const Icon(Icons.arrow_forward_rounded, color: Colors.white38),
                  ],
                ),
                const SizedBox(height: 16),
                Text(
                  routeName,
                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                const SizedBox(height: 20),
                Row(
                  children: [
                    Icon(Icons.people_alt_rounded, color: accentOrange, size: 20),
                    const SizedBox(width: 8),
                    Text('$studentsCount Élèves à bord', style: const TextStyle(color: Colors.white70, fontSize: 14)),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline_rounded, size: 60, color: Colors.redAccent.withOpacity(0.8)),
          const SizedBox(height: 16),
          Text(_errorMessage, style: const TextStyle(color: Colors.redAccent), textAlign: TextAlign.center),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.event_available_rounded, size: 80, color: Colors.white.withOpacity(0.2)),
          const SizedBox(height: 16),
          const Text('Aucun trajet prévu', style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          const Text('Vous n\'avez pas de course assignée aujourd\'hui.', style: TextStyle(color: Colors.grey)),
        ],
      ),
    );
  }
}