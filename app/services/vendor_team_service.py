"""
Vendor Cell Team & RBAC Management Service.
Provides sovereign role assignment, granular permission management, and member authentication.
"""

import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from app.domain_models import (
    TeamMember, TeamMemberStatus, CreateTeamMemberRequest, UpdateTeamMemberRequest
)
from app.security.rbac import UserRole, UserSession, create_access_token


ROLE_DEFAULT_PERMISSIONS: Dict[str, List[str]] = {
    UserRole.ROLE_VENDOR_ADMIN.value: [
        "team:manage", "billing:manage", "byoe:manage", "pricing:override",
        "autonomy:override", "dispatch:assign", "quotes:manage", "omnichannel:respond",
        "fleet:manage", "settlements:read", "settlements:payout", "flights:override"
    ],
    UserRole.ROLE_DISPATCHER.value: [
        "dispatch:assign", "dispatch:radar", "quotes:manage",
        "omnichannel:respond", "flights:override", "fleet:view",
        "trips:reassign", "timeline:read"
    ],
    UserRole.ROLE_CHAUFFEUR.value: [
        "trip:execute", "trip:accept", "trip:location_update",
        "earnings:read_own", "payouts:request_own", "shift:clock"
    ],
    UserRole.ROLE_CORPORATE_BOOKER.value: [
        "corporate:book", "corporate:cost_centers", "corporate:invoices",
        "booking:create", "booking:read"
    ],
    UserRole.ROLE_NETWORK_AFFILIATE.value: [
        "network:bid", "network:accept_leg", "settlements:read"
    ],
    UserRole.ROLE_CUSTOMER.value: [
        "booking:read", "booking:create", "timeline:read", "quote:calculate"
    ]
}


class VendorTeamService:
    def __init__(self):
        # In-memory storage keyed by vendor_id -> list of TeamMember
        self._teams: Dict[str, List[TeamMember]] = {}

    def get_team(self, vendor_id: str) -> List[TeamMember]:
        """Retrieves all team members for a sovereign vendor cell from database / registry dynamically."""
        v_id = vendor_id.replace("-", "_")
        if v_id not in self._teams:
            members: List[TeamMember] = []
            
            # 1. Dynamically resolve vendor owner / admin from database
            from app.database import db
            vendor_obj = getattr(db, "vendors", {}).get(v_id) or getattr(db, "vendors", {}).get(vendor_id)
            
            vendor_name = getattr(vendor_obj, "name", v_id.replace("_", " ").title()) if vendor_obj else v_id.replace("_", " ").title()
            contact_email = getattr(vendor_obj, "contact_email", f"dispatch@{v_id.replace('_', '-')}.com") if vendor_obj else f"dispatch@{v_id.replace('_', '-')}.com"
            contact_phone = getattr(vendor_obj, "phone", "") if vendor_obj else ""
            
            # Primary Owner/Admin
            owner_member = TeamMember(
                id=f"usr-owner-{v_id}",
                vendor_id=v_id,
                email=contact_email,
                full_name=f"{vendor_name} Principal",
                phone=contact_phone,
                role=UserRole.ROLE_VENDOR_ADMIN.value,
                status=TeamMemberStatus.ACTIVE,
                permissions=ROLE_DEFAULT_PERMISSIONS[UserRole.ROLE_VENDOR_ADMIN.value],
                last_active_at=datetime.now(timezone.utc)
            )
            members.append(owner_member)
            
            # Dispatch Lead
            domain_part = contact_email.split('@')[-1] if "@" in contact_email else f"{v_id}.com"
            dispatch_member = TeamMember(
                id=f"usr-dsp-{v_id}",
                vendor_id=v_id,
                email=f"dispatch@{domain_part}",
                full_name=f"{vendor_name} Dispatch",
                phone=contact_phone,
                role=UserRole.ROLE_DISPATCHER.value,
                status=TeamMemberStatus.ACTIVE,
                permissions=ROLE_DEFAULT_PERMISSIONS[UserRole.ROLE_DISPATCHER.value],
                last_active_at=datetime.now(timezone.utc)
            )
            members.append(dispatch_member)
            
            # Chauffeurs from db.drivers belonging to this vendor
            drivers = getattr(db, "drivers", {})
            found_drivers = 0
            for d_id, drv in drivers.items():
                if getattr(drv, "vendor_id", None) in (v_id, vendor_id):
                    drv_name = f"{drv.first_name} {drv.last_name}".strip() if hasattr(drv, "first_name") else f"Chauffeur {d_id}"
                    drv_member = TeamMember(
                        id=f"usr-drv-{d_id}",
                        vendor_id=v_id,
                        email=getattr(drv, "email", f"driver.{d_id}@{domain_part}"),
                        full_name=drv_name,
                        phone=getattr(drv, "phone", ""),
                        role=UserRole.ROLE_CHAUFFEUR.value,
                        status=TeamMemberStatus.ACTIVE,
                        driver_id=d_id,
                        assigned_vehicle_id=getattr(drv, "current_vehicle_id", None),
                        permissions=ROLE_DEFAULT_PERMISSIONS[UserRole.ROLE_CHAUFFEUR.value],
                        last_active_at=datetime.now(timezone.utc)
                    )
                    members.append(drv_member)
                    found_drivers += 1
            
            if found_drivers == 0:
                # Add default chauffeur role for newly spun up cell
                members.append(
                    TeamMember(
                        id=f"usr-drv-{v_id}-01",
                        vendor_id=v_id,
                        email=f"chauffeur1@{domain_part}",
                        full_name=f"{vendor_name} Chauffeur",
                        phone=contact_phone,
                        role=UserRole.ROLE_CHAUFFEUR.value,
                        status=TeamMemberStatus.ACTIVE,
                        permissions=ROLE_DEFAULT_PERMISSIONS[UserRole.ROLE_CHAUFFEUR.value],
                        last_active_at=datetime.now(timezone.utc)
                    )
                )

            # Corporate Desk Booker
            members.append(
                TeamMember(
                    id=f"usr-corp-{v_id}",
                    vendor_id=v_id,
                    email=f"corporate@{domain_part}",
                    full_name=f"{vendor_name} Corporate Desk",
                    phone=contact_phone,
                    role=UserRole.ROLE_CORPORATE_BOOKER.value,
                    status=TeamMemberStatus.ACTIVE,
                    permissions=ROLE_DEFAULT_PERMISSIONS[UserRole.ROLE_CORPORATE_BOOKER.value],
                    last_active_at=datetime.now(timezone.utc)
                )
            )
            
            self._teams[v_id] = members
            
        return self._teams[v_id]

    def get_member(self, vendor_id: str, user_id: str) -> Optional[TeamMember]:
        """Finds a specific team member by ID."""
        team = self.get_team(vendor_id)
        for member in team:
            if member.id == user_id:
                return member
        return None

    def create_member(self, req: CreateTeamMemberRequest) -> TeamMember:
        """Adds a new team member with assigned role and default/custom permissions."""
        v_id = req.vendor_id.replace("-", "_")
        team = self.get_team(v_id)
        
        # Determine permissions
        perms = req.permissions
        if not perms:
            perms = ROLE_DEFAULT_PERMISSIONS.get(req.role, ["timeline:read"])

        # Auto-link driver_id if chauffeur
        driver_id = req.driver_id
        if req.role == UserRole.ROLE_CHAUFFEUR.value and not driver_id:
            driver_id = f"drv-{v_id[:4]}-{len([m for m in team if m.role == UserRole.ROLE_CHAUFFEUR.value]) + 1:02d}"

        new_member = TeamMember(
            id=f"usr-{uuid.uuid4().hex[:8]}",
            vendor_id=v_id,
            email=req.email.strip().lower(),
            full_name=req.full_name.strip(),
            phone=req.phone,
            role=req.role,
            status=TeamMemberStatus.ACTIVE,
            driver_id=driver_id,
            assigned_vehicle_id=req.assigned_vehicle_id,
            permissions=perms,
            last_active_at=datetime.now(timezone.utc)
        )
        team.append(new_member)
        return new_member

    def add_team_member(self, vendor_id: str, member: TeamMember) -> TeamMember:
        """Directly attaches a provisioned TeamMember entity into the vendor team roster."""
        v_id = vendor_id.replace("-", "_")
        team = self.get_team(v_id)
        # Prepend owner to team or replace existing by email, id, or admin role
        if getattr(member.role, "value", str(member.role)).lower() in (UserRole.ROLE_VENDOR_ADMIN.value.lower(), "vendor_admin"):
            self._teams[v_id] = [
                m for m in team 
                if m.email.lower() != member.email.lower() 
                and m.id != member.id 
                and getattr(m.role, "value", str(m.role)).lower() not in (UserRole.ROLE_VENDOR_ADMIN.value.lower(), "vendor_admin")
            ]
        else:
            self._teams[v_id] = [m for m in team if m.email.lower() != member.email.lower() and m.id != member.id]
        self._teams[v_id].insert(0, member)
        return member

    def update_member(self, vendor_id: str, user_id: str, req: UpdateTeamMemberRequest) -> Optional[TeamMember]:
        """Updates team member role, permissions, status, or details."""
        member = self.get_member(vendor_id, user_id)
        if not member:
            return None

        if req.full_name is not None:
            member.full_name = req.full_name.strip()
        if req.phone is not None:
            member.phone = req.phone.strip()
        if req.role is not None:
            member.role = req.role
            if req.permissions is None:
                member.permissions = ROLE_DEFAULT_PERMISSIONS.get(req.role, member.permissions)
        if req.status is not None:
            member.status = req.status
        if req.permissions is not None:
            member.permissions = req.permissions
        if req.driver_id is not None:
            member.driver_id = req.driver_id
        if req.assigned_vehicle_id is not None:
            member.assigned_vehicle_id = req.assigned_vehicle_id

        member.last_active_at = datetime.now(timezone.utc)
        return member

    def delete_member(self, vendor_id: str, user_id: str) -> bool:
        """Removes / revokes a team member from the sovereign vendor cell."""
        team = self.get_team(vendor_id)
        for i, member in enumerate(team):
            if member.id == user_id:
                # Prevent deleting the last vendor admin
                m_role = getattr(member.role, "value", str(member.role))
                if "ADMIN" in m_role.upper() or "OWNER" in m_role.upper():
                    admins = [m for m in team if "ADMIN" in getattr(m.role, "value", str(m.role)).upper() or "OWNER" in getattr(m.role, "value", str(m.role)).upper()]
                    if len(admins) <= 1:
                        return False
                team.pop(i)
                return True
        return False

    def generate_member_token(self, vendor_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Generates a signed JWT session for instant login or role impersonation."""
        member = self.get_member(vendor_id, user_id)
        if not member:
            return None

        try:
            role_enum = UserRole(member.role)
        except ValueError:
            role_enum = UserRole.ROLE_DISPATCHER

        session = UserSession(
            user_id=member.id,
            email=member.email,
            full_name=member.full_name,
            role=role_enum,
            tenant_id="tenant-us-east",
            vendor_id=member.vendor_id,
            driver_id=member.driver_id,
            permissions=member.permissions
        )
        token = create_access_token(session)
        return {
            "token": token,
            "user": session.model_dump(),
            "role": member.role
        }


# Singleton Instance
vendor_team_service = VendorTeamService()
