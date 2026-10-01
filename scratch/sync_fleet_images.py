import os
import shutil
import glob
import sqlite3

# Generated artifact image mappings
artifacts_dir = r"C:\Users\saini\.gemini\antigravity-ide\brain\7c52a76f-1661-442a-bbb4-d40dbdeea6f3"

image_patterns = {
    "escalade": "fleet_escalade_esv_*.jpg",
    "mercedes_s": "fleet_mercedes_s_class_*.jpg",
    "sprinter": "fleet_mercedes_sprinter_*.jpg",
    "navigator": "fleet_lincoln_navigator_*.jpg",
    "bmw_7": "fleet_bmw_7_series_*.jpg",
    "range_rover": "fleet_range_rover_*.jpg",
    "maybach_ghost": "fleet_maybach_ghost_*.jpg",
    "suburban": "fleet_chevy_suburban_*.jpg",
    "lincoln_sedan": "fleet_lincoln_sedan_*.jpg"
}

source_files = {}
for key, pat in image_patterns.items():
    matches = glob.glob(os.path.join(artifacts_dir, pat))
    if matches:
        # Take latest
        matches.sort(key=os.path.getmtime, reverse=True)
        source_files[key] = matches[0]
        print(f"Found source image for {key}: {matches[0]}")
    else:
        print(f"WARNING: No image found for {key}")

# Target asset directories
dest_dirs = [
    "frontend/public/assets/fleet",
    "frontend/dist/assets/fleet",
    "data/media/fleet",
    "data/media/vendors/anb_philly/vehicles",
    "data/media/vendors/ny_executive/vehicles",
    "data/media/vendors/london_royal/vehicles",
    "data/media/vendors/dubai_emirates/vehicles"
]

for d in dest_dirs:
    os.makedirs(d, exist_ok=True)

# Copy base named images into asset dirs
for d in dest_dirs:
    for key, src in source_files.items():
        dst = os.path.join(d, f"{key}.jpg")
        shutil.copy2(src, dst)
print("Base images copied to all asset directories.")

# Map vehicle models to image names
def get_image_for_model(make_model, vehicle_class):
    mm = make_model.lower()
    if "escalade" in mm:
        return "escalade.jpg"
    elif "suburban" in mm or "yukon" in mm:
        return "suburban.jpg"
    elif "navigator" in mm or "aviator" in mm:
        return "navigator.jpg"
    elif "rover" in mm:
        return "range_rover.jpg"
    elif "maybach" in mm or "ghost" in mm or "rolls" in mm:
        return "maybach_ghost.jpg"
    elif "s-class" in mm or "s560" in mm or "s580" in mm:
        return "mercedes_s.jpg"
    elif "7 series" in mm or "740" in mm or "760" in mm or "750" in mm:
        return "bmw_7.jpg"
    elif "sprinter" in mm or "transit" in mm or "v-class" in mm:
        return "sprinter.jpg"
    elif "continental" in mm or "e-class" in mm or "xt6" in mm:
        return "lincoln_sedan.jpg"
    else:
        if vehicle_class == "LUXURY_SUV":
            return "escalade.jpg"
        elif vehicle_class == "FIRST_CLASS":
            return "mercedes_s.jpg"
        elif vehicle_class == "BUSINESS_VAN":
            return "sprinter.jpg"
        else:
            return "lincoln_sedan.jpg"

# Also copy vehicle ID specific files: veh_anb_01.jpg, etc.
conn = sqlite3.connect("limo_database.db")
cur = conn.cursor()

# Check if photo_url column exists in vendor_fleet_vehicles, if not add it
cur.execute("PRAGMA table_info(vendor_fleet_vehicles)")
cols = [c[1] for c in cur.fetchall()]
if "photo_url" not in cols:
    cur.execute("ALTER TABLE vendor_fleet_vehicles ADD COLUMN photo_url VARCHAR(255)")
    conn.commit()
    print("Added photo_url column to vendor_fleet_vehicles.")

cur.execute("SELECT vehicle_id, vendor_id, make_model, vehicle_class FROM vendor_fleet_vehicles")
vehicles = cur.fetchall()

for v_id, v_vendor, mm, v_class in vehicles:
    img_name = get_image_for_model(mm, v_class)
    key = img_name.replace(".jpg", "")
    src = source_files.get(key)
    if src:
        # Copy to vehicle_id named file in frontend public & dist
        for d in ["frontend/public/assets/fleet", "frontend/dist/assets/fleet", "data/media/fleet"]:
            dst = os.path.join(d, f"{v_id}.jpg")
            shutil.copy2(src, dst)
        
        # Update photo_url in DB
        rel_photo_url = f"/assets/fleet/{img_name}"
        cur.execute("UPDATE vendor_fleet_vehicles SET photo_url = ? WHERE vehicle_id = ?", (rel_photo_url, v_id))

conn.commit()
conn.close()
print(f"Updated {len(vehicles)} vehicles in database with photos and copied vehicle-specific assets.")
