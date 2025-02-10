import vehicleController from "../controllers/vehicle.controller";
const router = require('express').Router();

router.post('/register', vehicleController.registerVehicle);
router.get('/', vehicleController.getVehicles);
router.get('/:id', vehicleController.getVehicleById);
router.put('/:id/availability', vehicleController.updateVehicleAvailability);
router.get('/status/:status', vehicleController.getVehicleByStatus);

export default router;