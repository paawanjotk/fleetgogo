import tripController from "../controllers/trips.controller";

const router = require('express').Router();

router.post('/createTrip', tripController.createTrip);
router.get('/', tripController.getTrips);
router.get('/:id', tripController.getTripById);
router.put('/:id/status', tripController.updateTripStatus);

export default router;