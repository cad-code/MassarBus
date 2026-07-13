// lib/screens/map_screen.dart
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:ui'; 

class MapScreen extends StatefulWidget {
  final String studentId;
  final String tripId; 
  final double stopLat;
  final double stopLng;

  const MapScreen({
    super.key, 
    required this.studentId, 
    required this.tripId,
    required this.stopLat,
    required this.stopLng,
  });

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  LatLng _busPosition = const LatLng(34.0331, -5.0003); 
  late IO.Socket socket;
  final MapController _mapController = MapController();
  bool _isBusConnected = false;

  List<LatLng> _routePoints = [];
  String _etaText = "Calcul de l'itinéraire...";
  DateTime _lastOSRMCall = DateTime.now().subtract(const Duration(seconds: 15));
  
  late LatLng _studentStopPosition;

  final Color accentOrange = const Color(0xFFF59E0B);
  final Color bgDark = const Color(0xFF0B1120);

  @override
  void initState() {
    super.initState();
    _studentStopPosition = LatLng(widget.stopLat, widget.stopLng);
    _initSocketSecure();
    _fetchRouteAndETA(); 
  }

  Future<void> _fetchRouteAndETA() async {
    if (DateTime.now().difference(_lastOSRMCall).inSeconds < 10) return;
    _lastOSRMCall = DateTime.now();

    try {
      final url = 'http://router.project-osrm.org/route/v1/driving/${_busPosition.longitude},${_busPosition.latitude};${_studentStopPosition.longitude},${_studentStopPosition.latitude}?geometries=geojson&overview=full';
      
      final response = await http.get(Uri.parse(url));
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final route = data['routes'][0];

        final double durationSeconds = (route['duration'] as num).toDouble();
        final int minutes = (durationSeconds / 60).ceil();

        final List coordinates = route['geometry']['coordinates'];
        final List<LatLng> points = coordinates.map((coord) => 
          LatLng((coord[1] as num).toDouble(), (coord[0] as num).toDouble())
        ).toList();

        if (mounted) {
          setState(() {
            _etaText = minutes <= 1 ? "Arrivée imminente !" : "Arrivée estimée dans $minutes min";
            _routePoints = points;
          });
        }
      }
    } catch (e) {
      debugPrint("🔴 Erreur de calcul OSRM: $e");
    }
  }

  Future<void> _initSocketSecure() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('massarbus_token');

    if (token == null) return;

    socket = IO.io('http://192.168.42.115:5000', <String, dynamic>{
      'transports': ['websocket'],
      'autoConnect': false, 
      'auth': {
        'token': token 
      }
    });

    socket.onConnect((_) {
      debugPrint('✅ Connecté au serveur Socket.IO');
      socket.emit('join_trip', widget.tripId);
    });

    socket.on('bus_moved', (data) {
      if (mounted) {
        setState(() {
          _busPosition = LatLng((data['latitude'] as num).toDouble(), (data['longitude'] as num).toDouble());
          _isBusConnected = true;
        });
        
        _mapController.move(_busPosition, 16.0);
        _fetchRouteAndETA();
      }
    });

    socket.on('receive_broadcast_alert', (data) {
      if (data['target'] == 'all' || data['target'] == 'parents') {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              backgroundColor: accentOrange,
              behavior: SnackBarBehavior.floating,
              margin: const EdgeInsets.all(16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              content: Row(
                children: [
                  const Icon(Icons.campaign_rounded, color: Colors.white, size: 28),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text("Message du Chauffeur", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.white70)),
                        const SizedBox(height: 4),
                        Text(data['message'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                      ],
                    ),
                  ),
                ],
              ),
              duration: const Duration(seconds: 10),
            ),
          );
        }
      }
    });

    socket.connect();
  }

  @override
  void dispose() {
    socket.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBodyBehindAppBar: true, 
      appBar: AppBar(
        title: const Text('Suivi en direct', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
        flexibleSpace: ClipRRect(
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
            child: Container(color: bgDark.withOpacity(0.6)),
          ),
        ),
      ),
      body: Stack(
        children: [
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: _busPosition,
              initialZoom: 16.0,
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
                subdomains: const ['a', 'b', 'c', 'd'],
                userAgentPackageName: 'com.massarbus.parent',
              ),
              
              PolylineLayer(
                polylines: [
                  if (_routePoints.isNotEmpty)
                    Polyline(
                      points: _routePoints,
                      color: accentOrange, 
                      strokeWidth: 5.0,
                    ),
                ],
              ),

              MarkerLayer(
                markers: [
                  Marker(
                    point: _studentStopPosition,
                    width: 60,
                    height: 60,
                    child: Column(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(color: accentOrange.withOpacity(0.5), blurRadius: 15, spreadRadius: 2)
                            ],
                          ),
                          child: Icon(Icons.school_rounded, color: bgDark, size: 24),
                        ),
                      ],
                    ),
                  ),

                  // 🚌 Marqueur du Bus
                  Marker(
                    point: _busPosition,
                    width: 80,
                    height: 80,
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 300),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: _isBusConnected ? accentOrange : Colors.grey.shade700,
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.white, width: 2.5),
                              boxShadow: [
                                BoxShadow(
                                  color: _isBusConnected ? accentOrange.withOpacity(0.6) : Colors.transparent,
                                  blurRadius: 20,
                                  spreadRadius: 5,
                                )
                              ],
                            ),
                            child: const Icon(Icons.directions_bus_rounded, color: Colors.white, size: 28),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
          
          if (!_isBusConnected)
            Positioned(
              top: 100, // Sous l'AppBar
              left: 20,
              right: 20,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
                    decoration: BoxDecoration(
                      color: bgDark.withOpacity(0.7),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.white.withOpacity(0.1)),
                    ),
                    child: const Row(
                      children: [
                        SizedBox(
                          width: 20, height: 20,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                        ),
                        SizedBox(width: 16),
                        Expanded(
                          child: Text(
                            'En attente du signal GPS...',
                            style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),

          if (_isBusConnected && _routePoints.isNotEmpty)
            Positioned(
              bottom: 40,
              left: 20,
              right: 20,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(24),
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 15, sigmaY: 15),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 24),
                    decoration: BoxDecoration(
                      color: bgDark.withOpacity(0.75),
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(color: Colors.white.withOpacity(0.15), width: 1.5),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: accentOrange.withOpacity(0.2), 
                            shape: BoxShape.circle,
                          ),
                          child: Icon(Icons.schedule_rounded, color: accentOrange, size: 30),
                        ),
                        const SizedBox(width: 20),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Prochain arrêt', style: TextStyle(color: Colors.white54, fontSize: 13, fontWeight: FontWeight.w600, letterSpacing: 1)),
                              const SizedBox(height: 4),
                              Text(
                                _etaText,
                                style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900),
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
            
          Positioned(
            bottom: 140, 
            right: 20,
            child: FloatingActionButton(
              backgroundColor: bgDark,
              elevation: 8,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: BorderSide(color: Colors.white.withOpacity(0.1)),
              ),
              onPressed: () => _mapController.move(_busPosition, 16.0),
              child: Icon(Icons.my_location_rounded, color: accentOrange),
            ),
          ),
        ],
      ),
    );
  }
}