/* =====================================================================
   GORE TOWN — weapon catalogue
   Stats are derived from the real firearm each entry represents:
   muzzle energy drives damage, real cyclic rate drives RPM, real magazine
   capacity, real reload drills, real projectile velocity, real empty weight.
   ===================================================================== */

GF.WEAPON_MODELS = ['pistol', 'revolver', 'smg', 'rifle', 'carbine', 'shotgun', 'sniper', 'lmg', 'launcher', 'knife', 'blade', 'blunt', 'heavy', 'staff'];

/* name, caliber, dmg, rpm, mag, reserve, spread(deg), recoil, reload(s), velocity(m/s), weight(kg), model, auto, pellets, note */
const GF_WEAPON_SRC = {
  pistol: [
    ['Glock 17', '9x19mm', 25, 480, 17, 102, 1.15, 0.80, 1.55, 375, 0.71, 'pistol', 0, 1, 'Austrian polymer service pistol'],
    ['Glock 19', '9x19mm', 24, 480, 15, 90, 1.20, 0.76, 1.50, 375, 0.67, 'pistol', 0, 1, 'Compact Glock'],
    ['Glock 18', '9x19mm', 24, 1100, 17, 102, 2.30, 1.10, 1.60, 375, 0.72, 'pistol', 1, 1, 'Select-fire machine pistol'],
    ['Glock 21', '.45 ACP', 33, 430, 13, 78, 1.30, 1.05, 1.65, 260, 0.83, 'pistol', 0, 1, 'Full-size .45 Glock'],
    ['M1911A1', '.45 ACP', 34, 400, 7, 42, 1.35, 1.15, 1.75, 253, 1.11, 'pistol', 0, 1, '1911 pattern single action'],
    ['M9 Beretta', '9x19mm', 26, 450, 15, 90, 1.25, 0.85, 1.75, 381, 0.95, 'pistol', 0, 1, 'US military sidearm'],
    ['SIG P226', '9x19mm', 26, 460, 15, 90, 1.15, 0.82, 1.65, 380, 0.96, 'pistol', 0, 1, 'West German service pistol'],
    ['SIG P320', '9x19mm', 25, 470, 17, 102, 1.18, 0.80, 1.60, 378, 0.83, 'pistol', 0, 1, 'US M17 modular pistol'],
    ['CZ 75 B', '9x19mm', 25, 460, 16, 96, 1.10, 0.78, 1.60, 370, 1.00, 'pistol', 0, 1, 'Czech steel-frame pistol'],
    ['CZ P-10 C', '9x19mm', 25, 470, 15, 90, 1.14, 0.77, 1.55, 372, 0.74, 'pistol', 0, 1, 'Striker-fired compact'],
    ['HK USP', '9x19mm', 26, 450, 15, 90, 1.16, 0.86, 1.70, 380, 0.79, 'pistol', 0, 1, 'Heckler & Koch service pistol'],
    ['HK P30', '9x19mm', 25, 450, 15, 90, 1.20, 0.84, 1.65, 380, 0.74, 'pistol', 0, 1, 'Ergonomic HK frame'],
    ['FN Five-seveN', '5.7x28mm', 28, 480, 20, 120, 1.05, 0.62, 1.60, 650, 0.74, 'pistol', 0, 1, 'High-velocity AP pistol'],
    ['Beretta 92X', '9x19mm', 25, 450, 17, 102, 1.20, 0.85, 1.70, 381, 0.90, 'pistol', 0, 1, 'Modernised 92'],
    ['Walther PPQ', '9x19mm', 25, 480, 15, 90, 1.16, 0.80, 1.55, 380, 0.71, 'pistol', 0, 1, 'German striker pistol'],
    ['Walther P99', '9x19mm', 25, 460, 16, 96, 1.22, 0.86, 1.60, 408, 0.72, 'pistol', 0, 1, 'Compact police pistol'],
    ['S&W M&P9', '9x19mm', 25, 470, 17, 102, 1.18, 0.82, 1.60, 377, 0.69, 'pistol', 0, 1, 'American service polymer'],
    ['Springfield XD-9', '9x19mm', 25, 460, 16, 96, 1.20, 0.84, 1.62, 375, 0.79, 'pistol', 0, 1, 'Croatian-built service pistol'],
    ['Ruger SR9', '9x19mm', 25, 460, 17, 102, 1.21, 0.83, 1.58, 376, 0.75, 'pistol', 0, 1, 'Slim striker pistol'],
    ['Ruger Mark IV', '.22 LR', 12, 550, 10, 100, 0.95, 0.35, 1.70, 300, 0.90, 'pistol', 0, 1, 'Target rimfire'],
    ['Taurus G3', '9x19mm', 24, 450, 17, 102, 1.32, 0.90, 1.62, 370, 0.75, 'pistol', 0, 1, 'Budget service pistol'],
    ['Hi-Point C9', '9x19mm', 24, 430, 8, 48, 1.55, 1.10, 1.80, 350, 0.90, 'pistol', 0, 1, 'Heavy blowback pistol'],
    ['Desert Eagle .50', '.50 AE', 62, 320, 7, 28, 1.80, 1.85, 2.10, 470, 1.72, 'pistol', 0, 1, 'Gas-operated hand cannon'],
    ['Desert Eagle .44', '.44 Magnum', 52, 340, 8, 32, 1.55, 1.55, 2.05, 440, 1.60, 'pistol', 0, 1, '.44 Desert Eagle'],
    ['S&W Model 29', '.44 Magnum', 54, 200, 6, 36, 1.40, 1.70, 2.40, 435, 1.30, 'revolver', 0, 1, 'Dirty Harry wheelgun'],
    ['Colt Python', '.357 Magnum', 41, 210, 6, 36, 1.20, 1.35, 2.35, 420, 1.14, 'revolver', 0, 1, 'Vent-rib .357'],
    ['Ruger GP100', '.357 Magnum', 40, 200, 6, 36, 1.25, 1.30, 2.30, 415, 1.18, 'revolver', 0, 1, 'Rugged double action'],
    ['S&W 686', '.357 Magnum', 41, 205, 6, 36, 1.22, 1.28, 2.32, 420, 1.20, 'revolver', 0, 1, 'Stainless service revolver'],
    ['Chiappa Rhino', '.357 Magnum', 40, 210, 6, 36, 1.30, 0.95, 2.25, 420, 1.06, 'revolver', 0, 1, 'Low-barrel recoil revolver'],
    ['S&W 500', '.500 S&W', 88, 150, 5, 20, 2.10, 2.60, 2.80, 500, 1.80, 'revolver', 0, 1, 'Biggest production wheelgun'],
    ['TEC-9', '9x19mm', 24, 620, 32, 96, 2.60, 1.20, 2.10, 360, 1.32, 'pistol', 1, 1, 'Sheet-metal machine pistol'],
    ['MAC-10', '.45 ACP', 31, 950, 30, 90, 2.70, 1.30, 1.95, 280, 1.20, 'pistol', 1, 1, 'Boxy SMG pistol'],
    ['Micro Uzi', '9x19mm', 24, 1200, 20, 80, 3.00, 1.15, 2.00, 360, 1.50, 'pistol', 1, 1, 'Tiny open-bolt hose'],
    ['Skorpion vz.61', '.32 ACP', 17, 850, 20, 80, 2.40, 0.65, 1.90, 320, 1.28, 'pistol', 1, 1, 'Czech machine pistol'],
    ['Makarov PM', '9x18mm', 21, 430, 8, 40, 1.40, 0.95, 1.70, 315, 0.73, 'pistol', 0, 1, 'Soviet sidearm']
  ],
  smg: [
    ['MP5A5', '9x19mm', 25, 800, 30, 120, 1.60, 0.55, 2.10, 400, 2.88, 'smg', 1, 1, 'Roller-delayed SMG'],
    ['MP5SD', '9x19mm', 25, 800, 30, 120, 1.45, 0.45, 2.20, 285, 3.10, 'smg', 1, 1, 'Integrally suppressed MP5'],
    ['MP5K', '9x19mm', 25, 900, 30, 120, 2.10, 0.70, 2.00, 375, 2.50, 'smg', 1, 1, 'Short-barrel MP5'],
    ['MP7A2', '4.6x30mm', 26, 950, 40, 160, 1.70, 0.45, 2.05, 720, 1.90, 'smg', 1, 1, 'PDW armour piercer'],
    ['MP9', '9x19mm', 25, 1000, 30, 120, 1.90, 0.55, 1.95, 400, 1.40, 'smg', 1, 1, 'Swiss polymer PDW'],
    ['UMP45', '.45 ACP', 33, 600, 25, 100, 1.90, 0.85, 2.15, 300, 2.45, 'smg', 1, 1, 'HK UMP in .45'],
    ['UMP9', '9x19mm', 25, 650, 30, 120, 1.80, 0.65, 2.10, 380, 2.35, 'smg', 1, 1, 'UMP in 9mm'],
    ['P90', '5.7x28mm', 27, 900, 50, 200, 1.85, 0.50, 2.60, 715, 2.60, 'smg', 1, 1, 'Bullpup PDW'],
    ['Vector .45', '.45 ACP', 32, 1200, 25, 100, 1.55, 0.35, 2.25, 300, 2.70, 'smg', 1, 1, 'Super-V recoil system'],
    ['Vector 9mm', '9x19mm', 25, 1200, 33, 132, 1.45, 0.30, 2.20, 380, 2.60, 'smg', 1, 1, '9mm Kriss Vector'],
    ['PP-19 Bizon', '9x19mm', 25, 700, 64, 192, 1.75, 0.55, 2.60, 430, 2.10, 'smg', 1, 1, 'Helical magazine SMG'],
    ['PP-91 Kedr', '9x18mm', 21, 1000, 20, 100, 2.30, 0.60, 2.00, 310, 1.57, 'smg', 1, 1, 'Compact Russian SMG'],
    ['Uzi', '9x19mm', 24, 600, 32, 128, 2.10, 0.85, 2.20, 400, 3.50, 'smg', 1, 1, 'Iconic boxy SMG'],
    ['Uzi Pro', '9x19mm', 24, 1100, 25, 100, 2.30, 0.70, 2.05, 400, 2.30, 'smg', 1, 1, 'Modernised Uzi'],
    ['MAC-10 SMG', '.45 ACP', 31, 1150, 30, 120, 2.30, 0.95, 2.10, 280, 2.84, 'smg', 1, 1, 'Open-bolt hose'],
    ['Sten Mk II', '9x19mm', 25, 550, 32, 128, 2.60, 0.75, 2.40, 380, 3.00, 'smg', 1, 1, 'Wartime stamped SMG'],
    ['MP40', '9x19mm', 25, 550, 32, 128, 2.20, 0.80, 2.30, 400, 3.97, 'smg', 1, 1, 'German wartime SMG'],
    ['Thompson M1928', '.45 ACP', 33, 700, 30, 120, 2.10, 1.00, 2.70, 280, 4.90, 'smg', 1, 1, 'Chicago typewriter'],
    ['PPSh-41', '7.62x25mm', 29, 900, 71, 213, 2.40, 0.85, 2.50, 490, 3.63, 'smg', 1, 1, 'Soviet drum SMG'],
    ['SIG MPX', '9x19mm', 25, 850, 30, 120, 1.50, 0.45, 2.10, 400, 2.10, 'smg', 1, 1, 'Modern short-stroke SMG'],
    ['CZ Scorpion Evo', '9x19mm', 25, 1150, 30, 120, 1.65, 0.40, 2.10, 400, 2.77, 'smg', 1, 1, 'Czech EVO 3'],
    ['HK MP5/10', '10mm Auto', 35, 780, 30, 120, 1.70, 0.80, 2.15, 420, 2.90, 'smg', 1, 1, '10mm MP5'],
    ['Colt 9mm SMG', '9x19mm', 25, 750, 32, 128, 1.80, 0.65, 2.20, 400, 2.60, 'smg', 1, 1, 'AR-pattern SMG'],
    ['Kel-Tec SUB-2000', '9x19mm', 25, 700, 33, 132, 1.90, 0.70, 2.30, 400, 1.80, 'smg', 1, 1, 'Folding pistol carbine']
  ],
  rifle: [
    ['M4A1', '5.56x45mm', 38, 800, 30, 150, 1.10, 0.95, 2.20, 950, 3.00, 'carbine', 1, 1, 'US carbine'],
    ['M16A4', '5.56x45mm', 39, 750, 30, 150, 0.95, 0.90, 2.25, 950, 3.40, 'rifle', 0, 1, 'Full-length M16'],
    ['M4A1 SOPMOD', '5.56x45mm', 38, 800, 30, 150, 0.90, 0.85, 2.15, 950, 3.20, 'carbine', 1, 1, 'Accessorised M4'],
    ['HK416 A5', '5.56x45mm', 38, 850, 30, 150, 0.92, 0.85, 2.15, 917, 3.50, 'carbine', 1, 1, 'Short-stroke AR'],
    ['HK417', '7.62x51mm', 55, 700, 20, 100, 1.05, 1.30, 2.40, 820, 4.40, 'rifle', 1, 1, 'Battle rifle AR'],
    ['SCAR-L', '5.56x45mm', 38, 700, 30, 150, 1.00, 0.95, 2.30, 900, 3.40, 'rifle', 1, 1, 'Belgian modular rifle'],
    ['SCAR-H', '7.62x51mm', 55, 650, 20, 100, 1.15, 1.35, 2.45, 870, 3.90, 'rifle', 1, 1, 'Heavy SCAR'],
    ['AK-47', '7.62x39mm', 44, 600, 30, 180, 1.60, 1.15, 2.35, 715, 4.30, 'rifle', 1, 1, 'Soviet assault rifle'],
    ['AKM', '7.62x39mm', 44, 600, 30, 180, 1.55, 1.05, 2.30, 715, 3.60, 'rifle', 1, 1, 'Improved AK'],
    ['AK-74', '5.45x39mm', 36, 650, 30, 180, 1.35, 0.90, 2.30, 880, 3.30, 'rifle', 1, 1, 'Small-bore AK'],
    ['AKS-74U', '5.45x39mm', 35, 700, 30, 150, 1.90, 1.05, 2.25, 735, 2.94, 'carbine', 1, 1, 'Short AK'],
    ['AK-12', '5.45x39mm', 36, 700, 30, 180, 1.20, 0.85, 2.20, 900, 3.50, 'rifle', 1, 1, 'Modern AK'],
    ['AN-94', '5.45x39mm', 37, 1800, 30, 150, 1.05, 0.75, 2.35, 900, 3.85, 'rifle', 1, 1, 'Hyper-burst rifle (pulse)'],
    ['AS Val', '9x39mm', 46, 900, 20, 100, 1.30, 1.00, 2.40, 295, 2.96, 'rifle', 1, 1, 'Integrally suppressed'],
    ['VSS Vintorez', '9x39mm', 50, 800, 10, 60, 0.90, 1.10, 2.50, 290, 2.60, 'sniper', 0, 1, 'Suppressed DMR'],
    ['OTs-14 Groza', '9x39mm', 45, 750, 20, 100, 1.25, 1.10, 2.40, 300, 3.10, 'carbine', 1, 1, 'Bullpup assault rifle'],
    ['G36C', '5.56x45mm', 38, 750, 30, 150, 1.15, 0.90, 2.20, 920, 3.18, 'carbine', 1, 1, 'German compact rifle'],
    ['G36', '5.56x45mm', 38, 750, 30, 150, 1.05, 0.95, 2.25, 920, 3.63, 'rifle', 1, 1, 'German service rifle'],
    ['AUG A3', '5.56x45mm', 38, 720, 30, 150, 1.00, 0.90, 2.35, 900, 3.60, 'rifle', 1, 1, 'Austrian bullpup'],
    ['FAMAS F1', '5.56x45mm', 38, 900, 25, 125, 1.10, 0.95, 2.40, 925, 3.61, 'rifle', 1, 1, 'French bullpup'],
    ['L85A2', '5.56x45mm', 38, 650, 30, 150, 1.10, 1.00, 2.35, 940, 4.10, 'rifle', 1, 1, 'British bullpup'],
    ['SAR-21', '5.56x45mm', 38, 700, 30, 150, 1.05, 0.85, 2.30, 930, 3.50, 'rifle', 1, 1, 'Singaporean bullpup'],
    ['Tavor X95', '5.56x45mm', 38, 750, 30, 150, 1.05, 0.90, 2.25, 940, 3.30, 'rifle', 1, 1, 'Israeli bullpup'],
    ['QBZ-95', '5.8x42mm', 37, 650, 30, 150, 1.15, 0.95, 2.35, 930, 3.40, 'rifle', 1, 1, 'Chinese bullpup'],
    ['SIG MCX', '5.56x45mm', 38, 800, 30, 150, 1.00, 0.85, 2.20, 900, 3.10, 'carbine', 1, 1, 'Modular short-stroke'],
    ['Bren 2', '5.56x45mm', 38, 800, 30, 150, 1.00, 0.90, 2.25, 900, 3.50, 'rifle', 1, 1, 'Czech modern rifle'],
    ['ACR', '5.56x45mm', 38, 750, 30, 150, 0.98, 0.85, 2.30, 900, 3.30, 'rifle', 1, 1, 'Adaptive combat rifle'],
    ['XM8', '5.56x45mm', 38, 750, 30, 150, 1.05, 0.80, 2.20, 900, 3.10, 'rifle', 1, 1, 'Cancelled prototype'],
    ['StG 44', '7.92x33mm', 45, 550, 30, 150, 1.65, 1.20, 2.60, 685, 4.60, 'rifle', 1, 1, 'First assault rifle'],
    ['M1 Garand', '.30-06', 58, 240, 8, 48, 1.00, 1.55, 2.80, 850, 4.30, 'rifle', 0, 1, 'US service rifle'],
    ['M1 Carbine', '.30 Carbine', 34, 350, 15, 90, 1.20, 0.85, 2.30, 610, 2.40, 'carbine', 0, 1, 'Lightweight carbine'],
    ['M14', '7.62x51mm', 56, 400, 20, 100, 0.90, 1.45, 2.60, 850, 4.10, 'rifle', 0, 1, 'US battle rifle'],
    ['FAL', '7.62x51mm', 55, 650, 20, 100, 1.20, 1.50, 2.55, 840, 4.30, 'rifle', 1, 1, 'Right arm of the free world'],
    ['G3A3', '7.62x51mm', 55, 600, 20, 80, 1.25, 1.45, 2.60, 800, 4.40, 'rifle', 1, 1, 'Roller-delayed battle rifle'],
    ['SIG SG 550', '5.56x45mm', 39, 700, 30, 120, 0.95, 0.90, 2.30, 910, 4.10, 'rifle', 1, 1, 'Swiss precision rifle'],
    ['AR-15', '5.56x45mm', 38, 800, 30, 150, 1.10, 0.85, 2.20, 950, 2.90, 'carbine', 1, 1, 'Civilian AR platform'],
    ['HK G28', '7.62x51mm', 56, 500, 20, 100, 0.70, 1.35, 2.45, 830, 5.10, 'dmr', 0, 1, 'Designated marksman'],
    ['Mk 14 EBR', '7.62x51mm', 57, 450, 20, 100, 0.75, 1.40, 2.50, 850, 5.00, 'dmr', 0, 1, 'Enhanced battle rifle'],
    ['SKS', '7.62x39mm', 44, 380, 10, 60, 1.00, 1.20, 2.50, 735, 3.85, 'rifle', 0, 1, 'Soviet semi-auto carbine'],
    ['Mosin-Nagant', '7.62x54R', 74, 180, 5, 40, 0.85, 1.90, 3.00, 800, 4.00, 'sniper', 0, 1, 'Bolt-action warhorse'],
    ['Kar98k', '7.92x57mm', 70, 180, 5, 40, 0.90, 1.85, 2.95, 760, 3.90, 'sniper', 0, 1, 'German bolt rifle'],
    ['M1903 Springfield', '.30-06', 68, 170, 5, 40, 0.80, 1.80, 2.95, 800, 3.95, 'sniper', 0, 1, 'US bolt rifle'],
    ['M24 SWS', '7.62x51mm', 68, 150, 5, 40, 0.45, 1.80, 2.90, 780, 5.40, 'sniper', 0, 1, 'US army sniper'],
    ['M40A5', '7.62x51mm', 68, 150, 5, 40, 0.40, 1.75, 2.85, 775, 6.10, 'sniper', 0, 1, 'Marine scout sniper'],
    ['Remington 700', '.308 Win', 66, 160, 5, 40, 0.50, 1.70, 2.80, 780, 4.60, 'sniper', 0, 1, 'Classic precision rifle'],
    ['SVD Dragunov', '7.62x54R', 58, 300, 10, 60, 0.70, 1.45, 2.70, 830, 4.30, 'dmr', 0, 1, 'Soviet marksman rifle'],
    ['AWP', '.338 Lapua', 92, 100, 5, 30, 0.35, 2.40, 3.00, 900, 6.50, 'sniper', 0, 1, 'Arctic Warfare magnum'],
    ['Barrett M82', '.50 BMG', 140, 120, 10, 40, 0.60, 3.00, 3.60, 860, 12.90, 'sniper', 0, 1, 'Anti-materiel rifle'],
    ['CheyTac M200', '.408 CheyTac', 120, 90, 7, 28, 0.30, 2.30, 3.20, 940, 14.10, 'sniper', 0, 1, 'Extreme range rifle'],
    ['AXMC .338', '.338 Lapua', 94, 110, 10, 50, 0.35, 2.20, 3.05, 915, 6.80, 'sniper', 0, 1, 'Accuracy International AXMC'],
    ['M110 SASS', '7.62x51mm', 57, 450, 20, 100, 0.65, 1.30, 2.45, 830, 5.20, 'dmr', 0, 1, 'US semi-auto sniper'],
    ['SR-25', '7.62x51mm', 57, 480, 20, 100, 0.65, 1.25, 2.40, 835, 4.90, 'dmr', 0, 1, 'Knight\'s Armament rifle'],
    ['SVT-40', '7.62x54R', 57, 400, 10, 60, 1.05, 1.45, 2.65, 830, 3.85, 'rifle', 0, 1, 'Soviet semi-auto']
  ],
  shotgun: [
    ['Remington 870', '12 Gauge', 13, 90, 7, 42, 3.60, 2.00, 3.20, 400, 3.60, 'shotgun', 0, 9, 'Pump shotgun'],
    ['Mossberg 500', '12 Gauge', 13, 90, 6, 36, 3.65, 1.95, 3.10, 400, 3.30, 'shotgun', 0, 9, 'American pump'],
    ['Benelli M4', '12 Gauge', 12, 220, 7, 42, 3.20, 1.80, 2.90, 410, 3.80, 'shotgun', 0, 9, 'Semi-auto combat shotgun'],
    ['SPAS-12', '12 Gauge', 13, 180, 8, 48, 3.40, 1.85, 3.00, 400, 4.20, 'shotgun', 0, 9, 'Dual-mode shotgun'],
    ['AA-12', '12 Gauge', 12, 300, 8, 48, 4.20, 1.60, 3.40, 350, 5.20, 'shotgun', 1, 9, 'Full-auto drum shotgun'],
    ['Saiga-12', '12 Gauge', 12, 300, 8, 48, 3.80, 1.70, 3.10, 380, 3.80, 'shotgun', 1, 9, 'AK-pattern shotgun'],
    ['KSG', '12 Gauge', 13, 110, 14, 56, 3.80, 2.10, 3.50, 400, 3.10, 'shotgun', 0, 9, 'Bullpup pump'],
    ['KS-23', '23mm', 30, 70, 4, 20, 4.00, 3.20, 3.80, 340, 4.00, 'shotgun', 0, 6, 'Russian riot cannon'],
    ['USAS-12', '12 Gauge', 12, 320, 20, 60, 4.50, 1.75, 3.80, 350, 5.50, 'shotgun', 1, 9, 'Korean auto shotgun'],
    ['Striker 12', '12 Gauge', 12, 240, 12, 60, 4.60, 1.80, 4.20, 350, 4.40, 'shotgun', 0, 8, 'Revolving shotgun'],
    ['Neostead 2000', '12 Gauge', 13, 100, 12, 60, 3.70, 1.95, 3.40, 400, 3.50, 'shotgun', 0, 9, 'South African pump'],
    ['Mossberg 590A1', '12 Gauge', 13, 90, 8, 48, 3.50, 2.00, 3.15, 400, 3.60, 'shotgun', 0, 9, 'Military pump'],
    ['Franchi SPAS-15', '12 Gauge', 13, 200, 6, 36, 3.60, 1.85, 3.10, 400, 3.90, 'shotgun', 0, 9, 'Box-mag shotgun'],
    ['DP-12', '12 Gauge', 13, 120, 14, 56, 3.90, 2.05, 3.60, 400, 9, 'shotgun', 0, 9, 'Double-barrel pump'],
    ['TOZ-34', '12 Gauge', 14, 80, 2, 24, 3.20, 2.30, 3.60, 380, 3.20, 'shotgun', 0, 9, 'Break-action double'],
    ['Sawed-off', '12 Gauge', 12, 110, 2, 20, 5.60, 2.80, 3.00, 330, 2.20, 'shotgun', 0, 9, 'Short double barrel']
  ],
  lmg: [
    ['M249 SAW', '5.56x45mm', 38, 800, 100, 300, 2.10, 1.25, 5.20, 915, 7.50, 'lmg', 1, 1, 'Squad automatic weapon'],
    ['M240B', '7.62x51mm', 56, 650, 100, 300, 1.95, 1.80, 5.80, 840, 12.50, 'lmg', 1, 1, 'US medium machine gun'],
    ['PKM', '7.62x54R', 58, 650, 100, 300, 2.00, 1.85, 5.60, 830, 9.00, 'lmg', 1, 1, 'Soviet GPMG'],
    ['M60', '7.62x51mm', 57, 550, 100, 300, 2.25, 1.95, 5.90, 850, 10.50, 'lmg', 1, 1, 'American GPMG'],
    ['RPK-74', '5.45x39mm', 36, 650, 45, 225, 1.65, 1.05, 3.60, 880, 4.80, 'lmg', 1, 1, 'Squad light MG'],
    ['Minigun M134', '7.62x51mm', 52, 3000, 200, 800, 3.20, 2.20, 4.50, 850, 19.00, 'lmg', 1, 1, 'Six-barrel rotary'],
    ['LSAT', '5.56x45mm', 38, 800, 150, 300, 1.90, 1.10, 4.80, 920, 5.50, 'lmg', 1, 1, 'Lightweight prototype LMG'],
    ['Bren 2 LMG', '7.62x51mm', 56, 700, 50, 200, 1.80, 1.60, 4.60, 840, 7.30, 'lmg', 1, 1, 'Czech light MG'],
    ['HK21', '7.62x51mm', 56, 800, 100, 300, 2.00, 1.75, 5.40, 840, 9.30, 'lmg', 1, 1, 'Belt-fed HK'],
    ['QJY-88', '5.8x42mm', 37, 700, 100, 300, 1.85, 1.35, 5.20, 930, 10.00, 'lmg', 1, 1, 'Chinese GPMG']
  ],
  launcher: [
    ['RPG-7', '85mm HEAT', 120, 40, 1, 4, 1.20, 3.20, 3.20, 300, 7.00, 'launcher', 0, 1, 'Rocket-propelled grenade'],
    ['AT4', '84mm HEAT', 130, 35, 1, 3, 1.00, 3.00, 3.40, 290, 6.70, 'launcher', 0, 1, 'Disposable anti-tank'],
    ['M72 LAW', '66mm HEAT', 100, 40, 1, 3, 1.10, 2.60, 3.20, 270, 2.50, 'launcher', 0, 1, 'Light anti-tank weapon'],
    ['M79', '40mm HE', 95, 60, 1, 8, 2.20, 2.00, 2.60, 76, 2.90, 'launcher', 0, 1, 'Break-action grenade launcher'],
    ['M203', '40mm HE', 95, 70, 1, 8, 2.00, 1.80, 2.50, 76, 1.40, 'launcher', 0, 1, 'Under-barrel launcher'],
    ['M320', '40mm HE', 95, 70, 1, 8, 1.90, 1.75, 2.55, 76, 1.70, 'launcher', 0, 1, 'Modern 40mm launcher'],
    ['Milkor MGL', '40mm HE', 90, 120, 6, 12, 3.20, 1.90, 3.60, 76, 5.30, 'launcher', 0, 1, 'Revolving grenade launcher'],
    ['China Lake', '40mm HE', 95, 60, 4, 12, 3.00, 1.85, 3.40, 76, 8.20, 'launcher', 0, 1, 'Pump grenade launcher'],
    ['Carl Gustaf', '84mm HEAT', 135, 30, 1, 4, 1.00, 3.40, 4.20, 300, 8.50, 'launcher', 0, 1, 'Recoilless rifle'],
    ['Flamethrower', 'Fuel', 12, 900, 100, 200, 1.60, 0.30, 4.50, 40, 20.00, 'launcher', 1, 1, 'Stream of burning fuel']
  ],
  melee: [
    ['Combat Knife', 55, 170, 1.4, 0.25, 'knife', 'Fast silent blade'],
    ['Karambit', 48, 200, 1.2, 0.18, 'knife', 'Curved claw'],
    ['Machete', 78, 100, 1.9, 0.70, 'blade', 'Heavy cleaver'],
    ['Katana', 95, 85, 2.3, 1.10, 'blade', 'Folded steel sword'],
    ['Fire Axe', 105, 70, 2.0, 2.30, 'heavy', 'Breaching axe'],
    ['Sledgehammer', 130, 50, 2.2, 4.50, 'heavy', 'Crushing blow'],
    ['Crowbar', 62, 110, 1.8, 1.20, 'blunt', 'Half-life approved'],
    ['Baseball Bat', 60, 120, 2.0, 1.00, 'blunt', 'Wooden slugger'],
    ['Bat with Nails', 72, 115, 2.0, 1.20, 'blunt', 'Improvised gore'],
    ['Pipe Wrench', 70, 100, 1.9, 1.80, 'blunt', 'Heavy tool'],
    ['Shovel', 58, 90, 2.1, 2.00, 'staff', 'Entrenching tool'],
    ['Pitchfork', 66, 85, 2.4, 2.40, 'staff', 'Farm implement'],
    ['Spear', 70, 80, 2.8, 1.60, 'staff', 'Reach advantage'],
    ['Golf Club', 48, 130, 1.9, 0.50, 'blunt', 'Driver to the skull'],
    ['Police Baton', 45, 150, 1.7, 0.60, 'blunt', 'Expandable steel'],
    ['Warhammer', 120, 55, 2.0, 3.20, 'heavy', 'Crush armour'],
    ['Chainsaw', 160, 60, 1.9, 6.00, 'heavy', 'Dismemberment tool'],
    ['Butcher Cleaver', 88, 90, 1.4, 1.40, 'blade', 'Heavy kitchen blade'],
    ['Box Cutter', 30, 240, 1.0, 0.10, 'knife', 'Quick shallow cuts'],
    ['Glass Shard', 26, 260, 0.9, 0.05, 'knife', 'Desperate weapon'],
    ['Brass Knuckles', 38, 220, 0.9, 0.20, 'blunt', 'Bare-knuckle upgrade'],
    ['Screwdriver', 34, 200, 1.0, 0.15, 'knife', 'Puncturing tool'],
    ['Frying Pan', 52, 120, 1.6, 1.10, 'blunt', 'Clang'],
    ['Stop Sign', 74, 80, 2.2, 6.00, 'heavy', 'Street sign'],
    ['Bare Hands', 22, 190, 1.2, 0.00, 'blunt', 'Last resort']
  ]
};

GF.parseWeapons = function () {
  const out = [];
  const powerFor = (model) => ({ pistol: 1.0, revolver: 1.2, smg: 0.9, carbine: 1.3, rifle: 1.6, shotgun: 1.9, sniper: 2.2, dmr: 1.7, lmg: 1.8, launcher: 2.6, knife: 0.4, blade: 0.6, blunt: 0.5, heavy: 0.8, staff: 0.5 }[model] || 1);

  for (const cat in GF_WEAPON_SRC) {
    for (const row of GF_WEAPON_SRC[cat]) {
      let w;
      if (cat === 'melee') {
        const [name, dmg, rpm, reach, weight, model, note] = row;
        w = {
          id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          name, cat: 'melee', caliber: '—', dmg, rpm, mag: 0, reserve: 0,
          spread: 0, recoil: 0, reload: 0, vel: 0, pellets: 1, weight,
          model, auto: 0, note, reach, melee: true
        };
      } else {
        const [name, cal, dmg, rpm, mag, reserve, spread, recoil, reload, vel, weight, model, auto, pellets, note] = row;
        w = {
          id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          name, cat, caliber: cal, dmg, rpm, mag, reserve, spread, recoil,
          reload, vel, pellets, weight, model, auto: !!auto, note, melee: false
        };
      }
      const ballistic = !w.melee;
      w.power = ballistic ? powerFor(w.model) : 0.35;
      w.dps = Math.round(w.dmg * Math.min(w.rpm, 1200) / 60 * w.pellets);
      w.adsTime = GF.clamp(0.16 + w.weight * 0.035, 0.16, 0.62);
      w.equipTime = GF.clamp(0.28 + w.weight * 0.05, 0.28, 0.9);
      w.handling = GF.clamp(1 / (0.55 + w.weight * 0.28), 0.3, 1.6);
      w.effectiveRange = w.melee ? w.reach : GF.clamp(w.vel * 0.6, 12, 320);
      w.explosive = cat === 'launcher';
      w.ammoType = w.melee ? 'melee' : 'bullet';
      w.sound = w.model === 'sniper' ? 2.4 : w.model === 'shotgun' ? 2.0 : w.model === 'lmg' ? 1.9 : w.model === 'launcher' ? 2.8 : w.power;
      if (cat === 'launcher' && /Flamethrower/.test(w.name)) { w.ammoType = 'flame'; w.explosive = false; }
      out.push(w);
    }
  }
  return out;
};
GF.WEAPONS = GF.parseWeapons();
GF.weaponById = (id) => GF.WEAPONS.find(w => w.id === id) || null;
GF.weaponByName = (n) => GF.WEAPONS.find(w => w.name.toLowerCase() === String(n).toLowerCase()) || null;
GF.WEAPON_CATS = [
  { id: 'all', label: 'ALL' },
  { id: 'pistol', label: 'PISTOLS' },
  { id: 'smg', label: 'SMG' },
  { id: 'rifle', label: 'RIFLES' },
  { id: 'shotgun', label: 'SHOTGUNS' },
  { id: 'sniper', label: 'SNIPERS' },
  { id: 'lmg', label: 'LMG' },
  { id: 'launcher', label: 'LAUNCHERS' },
  { id: 'melee', label: 'MELEE' }
];
