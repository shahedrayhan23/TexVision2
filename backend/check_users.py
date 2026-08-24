#!/usr/bin/env python
import app.utils.local_db as db

print("\n=== AVAILABLE ACCOUNTS FOR TESTING ===\n")
users = db.find_all('users')

print("INSPECTORS:")
for u in users:
    if u['role'] == 'inspector':
        print(f"  • {u['email']}")

print("\nMANAGERS (use these for Manager Dashboard):")
for u in users:
    if u['role'] == 'manager':
        print(f"  • {u['email']}")
        
print(f"\nTotal users in database: {len(users)}")
print("\nNote: To login, use the email above with the password you created during registration.")
print("If you don't remember the password, you need to create a new account via the app's Register screen.")
