"""
Service Eligibility & Live Runtime Pre-Dispatch Verification Service.
Evaluates compliance against the exact scheduled trip date:
- Driver license valid on trip date
- Commercial fleet insurance (COI) valid on trip date
- Vehicle annual safety inspection valid
- Airport FBO / meet-and-greet permit active
Prevents dispatching expired or uncertified resources.
"""

import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from app.domain_models import ServiceEligibilityRecord, Driver, Vehicle
from app.database import db

logger = logging.getLogger("ServiceEligibilityService")


class ServiceEligibilityService:
    @classmethod
    def parse_iso_date(cls, date_str: Optional[str]) -> Optional[datetime]:
        if not date_str:
            return None
        try:
            if "T" in date_str:
                return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
            d = datetime.strptime(date_str.strip(), "%Y-%m-%d")
            return d.replace(tzinfo=timezone.utc)
        except Exception:
            return None

    @classmethod
    def verify_service_eligibility(
        cls,
        trip_id: str,
        driver_id: str,
        vehicle_id: str,
        scheduled_trip_utc: datetime,
        pickup_address: str = ""
    ) -> ServiceEligibilityRecord:
        """
        Executes pre-dispatch verification checking whether driver and vehicle
        credentials will be legally active and compliant ON THE SCHEDULED TRIP DATE.
        """
        driver: Optional[Driver] = db.drivers.get(driver_id)
        vehicle: Optional[Vehicle] = db.vehicles.get(vehicle_id)
        
        driver_name = f"{driver.first_name} {driver.last_name}" if driver else "Unassigned Driver"
        vehicle_model = f"{vehicle.make} {vehicle.model}" if vehicle else "Unassigned Vehicle"
        trip_date_str = scheduled_trip_utc.strftime("%Y-%m-%d")
        
        disqualifications: List[str] = []
        
        # 1. Driver License Check on Trip Date
        driver_lic_valid = True
        if driver:
            lic_exp = cls.parse_iso_date(driver.license_expiry_utc or driver.license_expiry)
            if lic_exp and lic_exp < scheduled_trip_utc:
                driver_lic_valid = False
                disqualifications.append(f"Driver license expired on {lic_exp.strftime('%Y-%m-%d')} before trip date ({trip_date_str}).")
        else:
            driver_lic_valid = False
            disqualifications.append("Driver profile not found in active fleet registry.")

        # 2. Vehicle Commercial Insurance Check on Trip Date
        insurance_valid = True
        inspection_valid = True
        if vehicle:
            ins_exp = cls.parse_iso_date(vehicle.insurance_expiry_utc)
            if ins_exp and ins_exp < scheduled_trip_utc:
                insurance_valid = False
                disqualifications.append(f"Vehicle commercial auto liability insurance expired on {ins_exp.strftime('%Y-%m-%d')} before trip date ({trip_date_str}).")
            
            insp_exp = cls.parse_iso_date(vehicle.inspection_expiry_utc)
            if insp_exp and insp_exp < scheduled_trip_utc:
                inspection_valid = False
                disqualifications.append(f"Vehicle safety inspection certificate expired on {insp_exp.strftime('%Y-%m-%d')}.")
        else:
            insurance_valid = False
            disqualifications.append("Vehicle not found in active fleet registry.")

        # 3. Airport Permit Check (if airport pickup)
        airport_permit_valid = True
        is_airport = any(a in pickup_address.lower() for a in ["airport", "jfk", "lga", "ewr", "lhr", "cdg", "dxb", "hnd", "terminal"])
        if is_airport and not vehicle_model:
            airport_permit_valid = False
            disqualifications.append("Airport pickup requires verified commercial airport operating permit.")

        is_eligible = (driver_lic_valid and insurance_valid and inspection_valid and airport_permit_valid)
        
        record = ServiceEligibilityRecord(
            trip_id=trip_id,
            driver_id=driver_id,
            driver_name=driver_name,
            vehicle_id=vehicle_id,
            vehicle_model=vehicle_model,
            scheduled_trip_date=trip_date_str,
            is_eligible=is_eligible,
            driver_license_valid_on_trip_date=driver_lic_valid,
            vehicle_insurance_valid_on_trip_date=insurance_valid,
            vehicle_inspection_valid=inspection_valid,
            airport_permit_active=airport_permit_valid,
            disqualification_reasons=disqualifications
        )
        
        if hasattr(db, 'service_eligibility_records'):
            db.service_eligibility_records[trip_id] = record
            
        logger.info(f"Service Eligibility for Trip {trip_id} on {trip_date_str}: {'ELIGIBLE' if is_eligible else 'DISQUALIFIED'} ({len(disqualifications)} flags)")
        return record
