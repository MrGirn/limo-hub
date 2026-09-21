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
        self._seed_initial_teams()

    def _seed_initial_teams(self):
        """Seeds standard realistic multi-role personnel for sovereign cells."""
        # ANB Limo Philadelphia Team
        self._teams["vendor_anb_philly"] = [
            TeamMember(
                id="usr-vnd-002",
                vendor_id="vendor_anb_philly",
                email="owner@anblimo-philly.com",
                full_name="Dave Anderson (Cell Principal & Owner)",
                phone="+1 (215) 555-0144",
                role=UserRole.ROLE_VENDOR_ADMIN.value,
                status=TeamMemberStatus.ACTIVE,
                permissions=ROLE_DEFAULT_PERMISSIONS[UserRole.ROLE_VENDOR_ADMIN.value],
                avatar_url="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
                last_active_at=datetime.now(timezone.utc)
            ),
            TeamMember(
                id="usr-dsp-002",
                vendor_id="vendor_anb_philly",
                email="dispatch@anblimo-philly.com",
                full_name="Samantha Taylor (PHL Hub Dispatch Lead)",
                phone="+1 (215) 555-0145",
                role=UserRole.ROLE_DISPATCHER.value,
                status=TeamMemberStatus.ACTIVE,
                permissions=ROLE_DEFAULT_PERMISSIONS[UserRole.ROLE_DISPATCHER.value],
                avatar_url="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80",
                last_active_at=datetime.now(timezone.utc)
            ),
            TeamMember(
                id="usr-drv-002",
                vendor_id="vendor_anb_philly",
                email="dave.miller@anblimo-philly.com",
                full_name="Dave Miller (Senior Chauffeur)",
                phone="+1 (215) 555-0188",
                role=UserRole.ROLE_CHAUFFEUR.value,
                status=TeamMemberStatus.ACTIVE,
                driver_id="drv-phl-01",
                assigned_vehicle_id="veh-phl-01",
                permissions=ROLE_DEFAULT_PERMISSIONS[UserRole.ROLE_CHAUFFEUR.value],
                avatar_url="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80",
                last_active_at=datetime.now(timezone.utc)
            ),
            TeamMember(
                id="usr-drv-003",
                vendor_id="vendor_anb_philly",
                email="marcus.vance@anblimo-philly.com",
                full_name="Marcus Vance (Master Chauffeur)",
                phone="+1 (215) 555-0199",
                role=UserRole.ROLE_CHAUFFEUR.value,
                status=TeamMemberStatus.ACTIVE,
                driver_id="drv-phl-02",
                assigned_vehicle_id="veh-phl-02",
                permissions=ROLE_DEFAULT_PERMISSIONS[UserRole.ROLE_CHAUFFEUR.value],
                avatar_url="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80",
                last_active_at=datetime.now(timezone.utc)
            ),
            TeamMember(
                id="usr-corp-001",
                vendor_id="vendor_anb_philly",
                email="traveldesk@blackrock-vip.com",
                full_name="Eleanor Vance (Corporate Travel Desk)",
                phone="+1 (212) 555-0810",
                role=UserRole.ROLE_CORPORATE_BOOKER.value,
                status=TeamMemberStatus.ACTIVE,
                permissions=ROLE_DEFAULT_PERMISSIONS[UserRole.ROLE_CORPORATE_BOOKER.value],
                avatar_url="https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&auto=format&fit=crop&q=80",
                last_active_at=datetime.now(timezone.utc)
            )
        ]

        # NY Executive Limousine Team
        self._teams["vendor-ny-executive"] = [
            TeamMember(
                id="usr-vnd-001",
                vendor_id="vendor-ny-executive",
                email="owner@ny-executive.com",
                full_name="Julian Sterling (NY Managing Director)",
                phone="+1 (212) 555-0110",
                role=UserRole.ROLE_VENDOR_ADMIN.value,
                status=TeamMemberStatus.ACTIVE,
                permissions=ROLE_DEFAULT_PERMISSIONS[UserRole.ROLE_VENDOR_ADMIN.value],
                avatar_url="https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120&auto=format&fit=crop&q=80",
                last_active_at=datetime.now(timezone.utc)
            ),
            TeamMember(
                id="usr-dsp-001",
                vendor_id="vendor-ny-executive",
                email="dispatch@ny-executive.com",
                full_name="Alex Chen (JFK / LGA Flight Dispatcher)",
                phone="+1 (212) 555-0111",
                role=UserRole.ROLE_DISPATCHER.value,
                status=TeamMemberStatus.ACTIVE,
                permissions=ROLE_DEFAULT_PERMISSIONS[UserRole.ROLE_DISPATCHER.value],
                avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
                last_active_at=datetime.now(timezone.utc)
            ),
            TeamMember(
                id="usr-drv-001",
                vendor_id="vendor-ny-executive",
                email="marcus.vance@ny-executive.com",
                full_name="Marcus Vance (Master Chauffeur)",
                phone="+1 (212) 555-0190",
                role=UserRole.ROLE_CHAUFFEUR.value,
                status=TeamMemberStatus.ACTIVE,
                driver_id="drv-ny-01",
                assigned_vehicle_id="veh-ny-01",
                permissions=ROLE_DEFAULT_PERMISSIONS[UserRole.ROLE_CHAUFFEUR.value],
                avatar_url="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&auto=format&fit=crop&q=80",
                last_active_at=datetime.now(timezone.utc)
            )
        ]

    def get_team(self, vendor_id: str) -> List[TeamMember]:
        """Retrieves all team members for a sovereign vendor cell."""
        if vendor_id not in self._teams:
            # Seed default owner + dispatcher + driver for new dynamic vendor
            self._teams[vendor_id] = [
                TeamMember(
                    id=f"usr-{uuid.uuid4().hex[:8]}",
                    vendor_id=vendor_id,
                    email=f"owner@{vendor_id.replace('_', '-')}.com",
                    full_name=f"{vendor_id.title()} Owner",
                    role=UserRole.ROLE_VENDOR_ADMIN.value,
                    status=TeamMemberStatus.ACTIVE,
                    permissions=ROLE_DEFAULT_PERMISSIONS[UserRole.ROLE_VENDOR_ADMIN.value]
                ),
                TeamMember(
                    id=f"usr-{uuid.uuid4().hex[:8]}",
                    vendor_id=vendor_id,
                    email=f"dispatch@{vendor_id.replace('_', '-')}.com",
                    full_name=f"{vendor_id.title()} Dispatch",
                    role=UserRole.ROLE_DISPATCHER.value,
                    status=TeamMemberStatus.ACTIVE,
                    permissions=ROLE_DEFAULT_PERMISSIONS[UserRole.ROLE_DISPATCHER.value]
                )
            ]
        return self._teams[vendor_id]

    def get_member(self, vendor_id: str, user_id: str) -> Optional[TeamMember]:
        """Finds a specific team member by ID."""
        team = self.get_team(vendor_id)
        for member in team:
            if member.id == user_id:
                return member
        return None

    def create_member(self, req: CreateTeamMemberRequest) -> TeamMember:
        """Adds a new team member with assigned role and default/custom permissions."""
        team = self.get_team(req.vendor_id)
        
        # Determine permissions
        perms = req.permissions
        if not perms:
            perms = ROLE_DEFAULT_PERMISSIONS.get(req.role, ["timeline:read"])

        # Auto-link driver_id if chauffeur
        driver_id = req.driver_id
        if req.role == UserRole.ROLE_CHAUFFEUR.value and not driver_id:
            driver_id = f"drv-{req.vendor_id[:4]}-{len([m for m in team if m.role == UserRole.ROLE_CHAUFFEUR.value]) + 1:02d}"

        new_member = TeamMember(
            id=f"usr-{uuid.uuid4().hex[:8]}",
            vendor_id=req.vendor_id,
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
        if vendor_id not in self._teams:
            self._teams[vendor_id] = []
        # Prepend owner to team or replace existing by email
        self._teams[vendor_id] = [m for m in self._teams[vendor_id] if m.email.lower() != member.email.lower()]
        self._teams[vendor_id].insert(0, member)
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
                if member.role == UserRole.ROLE_VENDOR_ADMIN.value:
                    admins = [m for m in team if m.role == UserRole.ROLE_VENDOR_ADMIN.value]
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
