// backend/utils/cronJobs.js
const cron = require('node-cron');
const Student = require('../models/Student');
const Route = require('../models/Route'); 
const Trip = require('../models/Trip');   

const initCronJobs = () => {
  
  // 1. TÂCHE DE MINUIT : Réinitialisation complète pour le lendemain
  cron.schedule('0 0 * * *', async () => {
    try {
      console.log(' [CRON] Début de la réinitialisation quotidienne des élèves...');
      
      // On met un filtre vide {} pour cibler TOUS les élèves,
      // et on remet l'absence à false ET le statut à 'PENDING'
      const result = await Student.updateMany(
        {}, 
        { 
          isAbsentToday: false, 
          status: 'PENDING' 
        }
      );
      
      console.log(`[CRON] Succès : ${result.modifiedCount} élève(s) remis à zéro pour la nouvelle journée.`);
    } catch (error) {
      console.error(' [CRON] Erreur lors de la réinitialisation des absences :', error);
    }
  }, {
    scheduled: true,
    timezone: "Africa/Casablanca" // Fuseau horaire marocain  !
  });

  // 2. TÂCHE DE 05H00 : Création automatique des trajets du matin
  cron.schedule('0 5 * * 1-5', async () => {
    try {
      console.log(' [CRON] Création automatique des trajets du matin...');
      
      const routes = await Route.find({}); 

      for (const route of routes) {
        if (route.defaultDriver && route.defaultBus) {
            await Trip.create({
                routeId: route._id,
                driverId: route.defaultDriver,
                busId: route.defaultBus,
                startTime: Date.now(),
                status: 'PENDING'
            });
            console.log(`[CRON] Trajet créé pour la ligne : ${route.routeName}`);
        }
      }
      console.log(' [CRON] Tous les trajets de la journée sont prêts !');
    } catch (error) {
      console.error('[CRON] Erreur lors de la création des trajets :', error);
    }
  }, {
    scheduled: true,
    timezone: "Africa/Casablanca"
  });
};

module.exports = initCronJobs;