import DriverController from "../controllers/driver.controller";

const router = require('express').Router();

router.post('/register', DriverController.registerDriver);
router.post('/login', DriverController.loginDriver);
router.get('/', DriverController.getDrivers);
router.get('/:id', DriverController.getDriverById);
router.put('/id/availability', DriverController.updateDriverAvailability);
router.get('/status/:status', DriverController.getDriverByStatus);


export default router;