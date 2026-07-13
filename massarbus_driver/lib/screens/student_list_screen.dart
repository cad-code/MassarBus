// lib/screens/student_list_screen.dart
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:geolocator/geolocator.dart'; 
import 'package:url_launcher/url_launcher.dart'; 

class StudentListScreen extends StatefulWidget {
  final String tripId;

  const StudentListScreen({super.key, required this.tripId});

  @override
  State<StudentListScreen> createState() => _StudentListScreenState();
}

class _StudentListScreenState extends State<StudentListScreen> {
  bool _isLoading = true;
  String _errorMessage = '';
  List<Map<String, dynamic>> students = [];

  final Color bgDark = const Color(0xFF0B1120); 
  final Color bgCard = const Color(0xFF1E293B);
  final Color accentOrange = const Color(0xFFF59E0B);
  final Color accentBlue = const Color(0xFF3B82F6);
  final Color successGreen = const Color(0xFF10B981);
  final Color dangerRed = const Color(0xFFEF4444);

  @override
  void initState() {
    super.initState();
    _fetchManifest();
  }

  //  NOTIFICATION  FLOTTANTE
  void _showPremiumToast(String message, Color color, IconData icon) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(icon, color: Colors.white, size: 24),
            const SizedBox(width: 12),
            Expanded(child: Text(message, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold))),
          ],
        ),
        backgroundColor: color.withOpacity(0.9),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        margin: const EdgeInsets.all(20),
        elevation: 10,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  Future<void> _fetchManifest() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('massarbus_token');

      final url = Uri.parse('http://192.168.42.115:5000/api/trips/${widget.tripId}/manifest');
      
      final response = await http.get(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
          'x-auth-token': token ?? '',
        },
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final manifestByStop = data['manifest'] as Map<String, dynamic>? ?? {};
        
        List<Map<String, dynamic>> loadedStudents = [];

        manifestByStop.forEach((stopName, studentsList) {
          for (var s in studentsList) {
            String currentStatus = "ATTENDU";
            if (s["status"] == "BOARDED") currentStatus = "A_BORD";
            if (s["status"] == "DROPPED") currentStatus = "ARRIVE";

            loadedStudents.add({
              "id": s["id"],
              "name": "${s['firstName']} ${s['lastName']}",
              "stop": stopName,
              "status": currentStatus, 
              "class": "Élève MassarBus", 
              "parentPhone": s["emergencyContact"] ?? "Non renseigné",
              "isAbsentToday": s["isAbsentToday"] ?? false 
            });
          }
        });

        if (mounted) {
          setState(() {
            students = loadedStudents;
            _isLoading = false;
          });
        }
      } else {
        if (mounted) {
          setState(() {
            _errorMessage = 'Erreur serveur : ${response.statusCode}';
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

  Future<void> _logAttendance(int index, String newStatus, String backendStatus) async {
    setState(() {
      students[index]["status"] = newStatus;
    });

    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('massarbus_token');
      
      double lat = 0.0, lng = 0.0;
      try {
        Position position = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high);
        lat = position.latitude;
        lng = position.longitude;
      } catch(e) {
        print("GPS non disponible pour le pointage");
      }

      final url = Uri.parse('http://192.168.42.115:5000/api/trips/${widget.tripId}/attendance');
      final response = await http.post(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
          'x-auth-token': token ?? '',
        },
        body: json.encode({
          "studentId": students[index]["id"],
          "status": backendStatus, 
          "latitude": lat,
          "longitude": lng
        }),
      );

      if (response.statusCode == 200) {
        _showPremiumToast('${students[index]["name"]} pointé(e) !', successGreen, Icons.check_circle_rounded);
      } else {
        setState(() {
          students[index]["status"] = "ATTENDU"; 
        });
        _showPremiumToast('Erreur lors du pointage.', dangerRed, Icons.error_rounded);
      }
    } catch (e) {
      _showPremiumToast('Erreur réseau.', dangerRed, Icons.wifi_off_rounded);
    }
  }

  void _marquerMontee(int index) => _logAttendance(index, "A_BORD", "BOARDED");
  void _marquerDescente(int index) => _logAttendance(index, "ARRIVE", "DROPPED");

  Future<void> _ouvrirGPS(String nomArret) async {
    final String recherche = Uri.encodeComponent('$nomArret, Fès, Maroc');
    final Uri url = Uri.parse('https://www.google.com/maps/search/?api=1&query=$recherche');

    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    } else {
      _showPremiumToast('Impossible d\'ouvrir le GPS', dangerRed, Icons.map_rounded);
    }
  }

  void _showStudentDetails(Map<String, dynamic> student) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) {
        return Container(
          padding: const EdgeInsets.only(top: 12, left: 24, right: 24, bottom: 40),
          decoration: BoxDecoration(
            color: bgCard,
            borderRadius: const BorderRadius.only(topLeft: Radius.circular(30), topRight: Radius.circular(30)),
            boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.5), blurRadius: 20)],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(width: 50, height: 5, decoration: BoxDecoration(color: Colors.grey.withOpacity(0.3), borderRadius: BorderRadius.circular(10))),
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  CircleAvatar(radius: 30, backgroundColor: accentBlue.withOpacity(0.2), child: Icon(Icons.person_rounded, color: accentBlue, size: 30)),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(student["name"], style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white)),
                        Text(student["class"], style: TextStyle(fontSize: 14, color: accentOrange, fontWeight: FontWeight.bold, letterSpacing: 1)),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 30),
              
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: bgDark, borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.white.withOpacity(0.05))),
                child: Row(
                  children: [
                    Container(padding: const EdgeInsets.all(12), decoration: BoxDecoration(color: accentBlue.withOpacity(0.1), shape: BoxShape.circle), child: Icon(Icons.location_on_rounded, color: accentBlue)),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text("Arrêt Prévu", style: TextStyle(color: Colors.grey, fontSize: 12, letterSpacing: 1)),
                          const SizedBox(height: 4),
                          Text(student["stop"], style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: Icon(Icons.navigation_rounded, color: successGreen, size: 28),
                      onPressed: () {
                        Navigator.pop(context); 
                        _ouvrirGPS(student["stop"]); 
                      },
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              
              // Carte Info Parent
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: bgDark, borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.white.withOpacity(0.05))),
                child: Row(
                  children: [
                    Container(padding: const EdgeInsets.all(12), decoration: BoxDecoration(color: accentOrange.withOpacity(0.1), shape: BoxShape.circle), child: Icon(Icons.phone_rounded, color: accentOrange)),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text("Contact Parent", style: TextStyle(color: Colors.grey, fontSize: 12, letterSpacing: 1)),
                          const SizedBox(height: 4),
                          Text(student["parentPhone"], style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      }
    );
  }

  //BOUTONS D'ACTION 
  Widget _buildStatusButton(int index, String status, bool isAbsent) {
    if (isAbsent) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(color: dangerRed.withOpacity(0.1), borderRadius: BorderRadius.circular(20), border: Border.all(color: dangerRed.withOpacity(0.3))),
        child: Text("ABSENT", style: TextStyle(color: dangerRed, fontSize: 12, fontWeight: FontWeight.bold)),
      );
    }

    if (status == "ATTENDU") {
      return ElevatedButton(
        onPressed: () => _marquerMontee(index),
        style: ElevatedButton.styleFrom(
          backgroundColor: accentBlue,
          foregroundColor: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        ),
        child: const Text('MONTER', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 1)),
      );
    } else if (status == "A_BORD") {
      return ElevatedButton(
        onPressed: () => _marquerDescente(index),
        style: ElevatedButton.styleFrom(
          backgroundColor: accentOrange,
          foregroundColor: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        ),
        child: const Text('DESCENDRE', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 1)),
      );
    } else {
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.check_circle_rounded, color: successGreen, size: 20),
          const SizedBox(width: 6),
          Text("ARRIVÉ", style: TextStyle(color: successGreen, fontWeight: FontWeight.bold)),
        ],
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: bgDark,
      appBar: AppBar(
        title: const Text('Liste d\'appel', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
        backgroundColor: bgCard,
        elevation: 0,
        centerTitle: true,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: _isLoading 
        ? Center(child: CircularProgressIndicator(color: accentBlue))
        : _errorMessage.isNotEmpty
          ? Center(child: Text(_errorMessage, style: TextStyle(color: dangerRed)))
          : students.isEmpty
            ? const Center(child: Text('Aucun élève assigné à ce trajet.', style: TextStyle(color: Colors.grey)))
            : ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: students.length,
                separatorBuilder: (context, index) => const SizedBox(height: 12),
                itemBuilder: (context, index) {
                  final student = students[index];
                  final isBoarded = student["status"] == "A_BORD";
                  final isArrived = student["status"] == "ARRIVE";
                  final isAbsent = student["isAbsentToday"] ?? false;

                  return Container(
                    decoration: BoxDecoration(
                      color: isAbsent ? bgCard.withOpacity(0.5) : bgCard, // Plus sombre si absent
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: isAbsent 
                          ? dangerRed.withOpacity(0.3) 
                          : (isBoarded ? accentOrange.withOpacity(0.3) : Colors.white.withOpacity(0.05)),
                        width: 1.5
                      ),
                      boxShadow: [
                        if (!isAbsent && !isArrived)
                          BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 10, offset: const Offset(0, 5))
                      ],
                    ),
                    child: Material(
                      color: Colors.transparent,
                      child: InkWell(
                        borderRadius: BorderRadius.circular(16),
                        onTap: () => _showStudentDetails(student),
                        child: Padding(
                          padding: const EdgeInsets.all(16.0),
                          child: Row(
                            children: [
                              // Pastille d'état
                              Container(
                                width: 45,
                                height: 45,
                                decoration: BoxDecoration(
                                  color: isAbsent ? dangerRed.withOpacity(0.1) : (isArrived ? successGreen.withOpacity(0.1) : (isBoarded ? accentOrange.withOpacity(0.1) : accentBlue.withOpacity(0.1))),
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(
                                  isAbsent ? Icons.person_off_rounded : (isArrived ? Icons.how_to_reg_rounded : (isBoarded ? Icons.directions_bus_rounded : Icons.person_outline_rounded)),
                                  color: isAbsent ? dangerRed : (isArrived ? successGreen : (isBoarded ? accentOrange : accentBlue)),
                                ),
                              ),
                              const SizedBox(width: 16),
                              
                              // Infos élève
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      student["name"]!, 
                                      style: TextStyle(
                                        fontWeight: FontWeight.bold, 
                                        fontSize: 16, 
                                        color: isAbsent ? Colors.grey : Colors.white,
                                        decoration: isAbsent ? TextDecoration.lineThrough : TextDecoration.none,
                                      )
                                    ),
                                    const SizedBox(height: 4),
                                    Row(
                                      children: [
                                        Icon(Icons.location_on_rounded, size: 14, color: isAbsent ? Colors.grey : Colors.white54),
                                        const SizedBox(width: 4),
                                        Expanded(
                                          child: Text(
                                            student["stop"], 
                                            style: TextStyle(color: isAbsent ? Colors.grey : Colors.white70, fontSize: 13),
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                              
                              // Bouton d'action
                              const SizedBox(width: 8),
                              _buildStatusButton(index, student["status"], isAbsent),
                            ],
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
    );
  }
}
