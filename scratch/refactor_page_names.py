import os
import re

base_dir = r"packages/global_hub/frontend/src/components/PublicBooking"
pages_dir = os.path.join(base_dir, "pages")

# Mapping from old file to new file & component name
mappings = {
    "Page05RideDetails.tsx": ("RideSelectionPage.tsx", "Page05RideDetails", "RideSelectionPage"),
    "Page06PassengerDetails.tsx": ("PassengerDetailsPage.tsx", "Page06PassengerDetails", "PassengerDetailsPage"),
    "Page07ReviewAndPay.tsx": ("ReviewAndCheckoutPage.tsx", "Page07ReviewAndPay", "ReviewAndCheckoutPage"),
    "Page08BookingConfirmed.tsx": ("BookingConfirmationPage.tsx", "Page08BookingConfirmed", "BookingConfirmationPage"),
    "Page09SignInFindBooking.tsx": ("FindBookingLookupPage.tsx", "Page09SignInFindBooking", "FindBookingLookupPage"),
    "Page10MyBookings.tsx": ("CustomerBookingsHubPage.tsx", "Page10MyBookings", "CustomerBookingsHubPage"),
    "Page11ManageTrackRide.tsx": ("LiveRideTelemetryPage.tsx", "Page11ManageTrackRide", "LiveRideTelemetryPage"),
    "Page12HelpContact.tsx": ("HelpAndConciergeSupportPage.tsx", "Page12HelpContact", "HelpAndConciergeSupportPage"),
}

# 1. Update component files themselves and rename
for old_name, (new_name, old_comp, new_comp) in mappings.items():
    old_path = os.path.join(pages_dir, old_name)
    new_path = os.path.join(pages_dir, new_name)
    
    if os.path.exists(old_path):
        with open(old_path, "r", encoding="utf-8") as f:
            content = f.read()
        
        # Replace component declaration
        content = content.replace(f"export const {old_comp}:", f"export const {new_comp}:")
        content = content.replace(f"const {old_comp}:", f"const {new_comp}:")
        
        with open(new_path, "w", encoding="utf-8") as f:
            f.write(content)
        
        os.remove(old_path)
        print(f"Renamed & updated: {old_name} -> {new_name} (Component: {new_comp})")

# 2. Update LimoPublicBookingApp.tsx
app_path = os.path.join(base_dir, "LimoPublicBookingApp.tsx")
if os.path.exists(app_path):
    with open(app_path, "r", encoding="utf-8") as f:
        app_content = f.read()
    
    for old_name, (new_name, old_comp, new_comp) in mappings.items():
        old_module = old_name.replace(".tsx", "")
        new_module = new_name.replace(".tsx", "")
        app_content = app_content.replace(f"import {{ {old_comp} }} from './pages/{old_module}';", f"import {{ {new_comp} }} from './pages/{new_module}';")
        app_content = app_content.replace(f"<{old_comp}", f"<{new_comp}")
        app_content = app_content.replace(f"</{old_comp}>", f"</{new_comp}>")
    
    with open(app_path, "w", encoding="utf-8") as f:
        f.write(app_content)
    print("Updated LimoPublicBookingApp.tsx with clean component imports.")

print("All page components renamed successfully.")
