#!/usr/bin/env python3
"""
Generates 4 distinct, professional Iranian commercial advertisement videos:
1. ad_snapp.mp4 (Snapp SuperApp - Emerald / Mint)
2. ad_digikala.mp4 (Digikala Incredible Offers - Red / Crimson)
3. ad_bazaar.mp4 (Cafe Bazaar Mobile Games - Teal / Cyan)
4. ad_tapsell_pro.mp4 (Tapsell Sponsor Network - Gold / Amber)
Each has distinct colors, headlines, timing, and unique musical tracks!
"""
import os
import subprocess
import struct
import math
import shutil

FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
PUBLIC_DIR = "/app/applet/public"
DIST_DIR = "/app/applet/dist"

def make_audio(filename, base_freqs, duration=7, bpm=120):
    sample_rate = 44100
    total_samples = sample_rate * duration
    audio_data = bytearray()
    beats_per_sec = bpm / 60.0

    for i in range(total_samples):
        t = i / sample_rate
        beat = (t * beats_per_sec) % 1.0
        env = math.exp(-beat * 5.0)

        step = int((t * beats_per_sec * 2) % len(base_freqs))
        freq = base_freqs[step]

        val = math.sin(2.0 * math.pi * freq * t) * 0.25 * env
        # Warm pad
        for bf in base_freqs[:3]:
            val += math.sin(2.0 * math.pi * bf * t) * 0.05

        # Bass thump on beat
        if beat < 0.15:
            k_env = (1.0 - beat / 0.15)
            val += math.sin(2.0 * math.pi * 65.0 * t) * 0.3 * k_env

        val = max(-1.0, min(1.0, val))
        audio_data.extend(struct.pack('<h', int(val * 32767.0)))

    with open(filename, "wb") as f:
        f.write(b"RIFF")
        f.write(struct.pack('<I', 36 + len(audio_data)))
        f.write(b"WAVEfmt ")
        f.write(struct.pack('<I', 16))
        f.write(struct.pack('<H', 1))  # PCM
        f.write(struct.pack('<H', 1))  # Mono
        f.write(struct.pack('<I', sample_rate))
        f.write(struct.pack('<I', sample_rate * 2))
        f.write(struct.pack('<H', 2))
        f.write(struct.pack('<H', 16))
        f.write(b"data")
        f.write(struct.pack('<I', len(audio_data)))
        f.write(audio_data)

def build_single_ad(name, bg_grad, border_col, title_badge, main_title, subtitle, cta_text, freqs, duration=7):
    img_path = f"/tmp/{name}_card.png"
    audio_path = f"/tmp/{name}_audio.wav"
    out_path = f"{PUBLIC_DIR}/{name}.mp4"

    # Make Image with ImageMagick
    cmd_img = [
        "convert", "-size", "640x360", f"gradient:{bg_grad}",
        "-stroke", border_col, "-strokewidth", "4", "-fill", "none",
        "-draw", "roundrectangle 16,16 624,344 24,24",
        "-fill", "#fcd34d", "-stroke", "none", "-font", FONT, "-pointsize", "16",
        "-gravity", "north", "-annotate", "+0+32", title_badge,
        "-fill", "#ffffff", "-font", FONT, "-pointsize", "28",
        "-gravity", "center", "-annotate", "+0-35", main_title,
        "-fill", "#a7f3d0", "-font", FONT, "-pointsize", "19",
        "-gravity", "center", "-annotate", "+0+15", subtitle,
        "-fill", "#fef08a", "-font", FONT, "-pointsize", "22",
        "-gravity", "center", "-annotate", "+0+65", "+100 GOLD COINS REWARD",
        "-fill", "#000000", "-stroke", "#fcd34d", "-strokewidth", "2",
        "-draw", "roundrectangle 210,275 430,318 12,12",
        "-fill", "#fcd34d", "-stroke", "none", "-font", FONT, "-pointsize", "15",
        "-gravity", "south", "-annotate", "+0+47", cta_text,
        img_path
    ]
    subprocess.run(cmd_img, check=True)

    # Make Audio
    make_audio(audio_path, freqs, duration=duration)

    # Encode with FFmpeg
    cmd_vid = [
        "ffmpeg", "-y",
        "-loop", "1", "-t", str(duration), "-i", img_path,
        "-i", audio_path,
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "fast",
        "-crf", "22",
        "-c:a", "aac",
        "-b:a", "96k",
        "-shortest",
        out_path
    ]
    subprocess.run(cmd_vid, check=True)
    if os.path.exists(DIST_DIR):
        shutil.copy2(out_path, f"{DIST_DIR}/{name}.mp4")
    print(f"Generated {out_path} ({os.path.getsize(out_path)/1024:.1f} KB)")

if __name__ == "__main__":
    # 1. Snapp SuperApp
    build_single_ad(
        "ad_snapp", "#064e3b-#059669", "#34d399",
        "TAPSELL NETWORK | SPONSOR: SNAPP",
        "SNAPP SUPER APP",
        "DISCOUNT CODE: DOOZ2026",
        "INSTALL NOW",
        [261.63, 329.63, 392.00, 523.25, 659.25],
        duration=7
    )

    # 2. Digikala Incredible Offers
    build_single_ad(
        "ad_digikala", "#881337-#e11d48", "#fb7185",
        "TAPSELL NETWORK | SPONSOR: DIGIKALA",
        "INCREDIBLE OFFERS 50% OFF",
        "BEST DEALS OF THE WEEK",
        "SHOP SPECIALS",
        [293.66, 369.99, 440.00, 587.33, 739.99],
        duration=7
    )

    # 3. Cafe Bazaar Mobile Games
    build_single_ad(
        "ad_bazaar", "#134e4a-#0d9488", "#2dd4bf",
        "TAPSELL NETWORK | CAFE BAZAAR",
        "IRANIAN BOARD GAMES LEAGUE",
        "COMPETE & WIN WEEKLY PRIZES",
        "GET APP ON BAZAAR",
        [329.63, 392.00, 493.88, 659.25, 783.99],
        duration=7
    )

    # 4. Tapsell Official Tournament
    build_single_ad(
        "ad_tapsell_pro", "#78350f-#d97706", "#fcd34d",
        "TAPSELL OFFICIAL REWARD NETWORK",
        "DOOZ IRANIAN CHAMPIONSHIP",
        "ZONE ID: 6ae1bd1817758066a4da86c1",
        "CLAIM PRIZE",
        [349.23, 440.00, 523.25, 698.46, 880.00],
        duration=7
    )
