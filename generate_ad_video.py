#!/usr/bin/env python3
"""
Generates a real, high-definition, animated 7-second commercial MP4 video
specifically for the Dooz Tapsell rewarded ad system.
No external dependencies required (uses standard library + ffmpeg).
"""
import math
import os
import subprocess
import struct

WIDTH = 640
HEIGHT = 360
FPS = 30
DURATION_SEC = 7
TOTAL_FRAMES = FPS * DURATION_SEC
OUT_MP4 = "/app/applet/public/tapsell_ad.mp4"

def make_chords_audio():
    """Synthesizes a pleasant melodic commercial chime in WAV format."""
    sample_rate = 44100
    total_samples = sample_rate * DURATION_SEC
    audio_data = bytearray()

    # Musical notes in Hz (C4, E4, G4, B4, C5, E5, G5)
    notes = [
        [261.63, 329.63, 392.00],  # C major
        [293.66, 369.99, 440.00],  # D major
        [329.63, 392.00, 493.88],  # E minor
        [349.23, 440.00, 523.25],  # F major
        [392.00, 493.88, 587.33],  # G major
        [523.25, 659.25, 783.99],  # C5 flourish
        [523.25, 659.25, 1046.50]  # Final victory chord
    ]

    for i in range(total_samples):
        t = i / sample_rate
        sec_idx = min(int(t), len(notes) - 1)
        chord = notes[sec_idx]

        # Envelope within the second (attack & decay)
        sub_t = t - int(t)
        envelope = math.exp(-sub_t * 3.5)

        val = 0.0
        for freq in chord:
            val += math.sin(2.0 * math.pi * freq * t) * (0.28 / len(chord))

        # Add a soft warm sub-bass
        val += math.sin(2.0 * math.pi * 130.81 * t) * 0.12 * envelope

        val = max(-1.0, min(1.0, val * envelope))
        sample_int = int(val * 32767.0)
        audio_data.extend(struct.pack('<h', sample_int))

    # Write WAV file
    wav_path = "/tmp/ad_audio.wav"
    with open(wav_path, "wb") as f:
        # RIFF header
        f.write(b"RIFF")
        f.write(struct.pack('<I', 36 + len(audio_data)))
        f.write(b"WAVEfmt ")
        f.write(struct.pack('<I', 16))
        f.write(struct.pack('<H', 1))  # PCM
        f.write(struct.pack('<H', 1))  # Mono
        f.write(struct.pack('<I', sample_rate))
        f.write(struct.pack('<I', sample_rate * 2))  # Byte rate
        f.write(struct.pack('<H', 2))  # Block align
        f.write(struct.pack('<H', 16)) # Bits per sample
        f.write(b"data")
        f.write(struct.pack('<I', len(audio_data)))
        f.write(audio_data)

    return wav_path

def main():
    wav_path = make_chords_audio()
    print("Audio synthesized. Starting video frame generation...")

    # Launch ffmpeg process reading raw PPM stream from stdin
    ffmpeg_cmd = [
        "ffmpeg", "-y",
        "-f", "image2pipe",
        "-vcodec", "ppm",
        "-r", str(FPS),
        "-i", "-",
        "-i", wav_path,
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "fast",
        "-crf", "22",
        "-c:a", "aac",
        "-b:a", "128k",
        "-shortest",
        OUT_MP4
    ]

    proc = subprocess.Popen(ffmpeg_cmd, stdin=subprocess.PIPE)

    # Frame buffer
    for frame_idx in range(TOTAL_FRAMES):
        t = frame_idx / FPS
        # Build PPM P6 binary frame
        # Background: rich dark amber / Persian turquoise radial gradient
        cx = WIDTH // 2
        cy = HEIGHT // 2

        # Pulsing radius
        pulse = 1.0 + 0.08 * math.sin(t * 4.0)

        # Draw frame into bytearray
        pixels = bytearray(WIDTH * HEIGHT * 3)

        # Rotating beam angle
        angle = t * 1.5

        for y in range(0, HEIGHT, 2):  # step 2 for speed
            dy = y - cy
            for x in range(0, WIDTH, 2):
                dx = x - cx
                dist = math.hypot(dx, dy)

                # Base background color
                # Radial gradient from dark mahogany to obsidian
                r_base = max(18, int(45 - dist * 0.08))
                g_base = max(12, int(28 - dist * 0.05))
                b_base = max(8,  int(18 - dist * 0.03))

                # Glowing circular ring
                ring_r = 90.0 * pulse
                diff = abs(dist - ring_r)
                if diff < 18:
                    intensity = (1.0 - diff / 18.0)
                    r_base = min(255, int(r_base + 220 * intensity))
                    g_base = min(255, int(g_base + 160 * intensity))
                    b_base = min(255, int(b_base + 30 * intensity))

                # Dooz moving stones animation:
                # 3 stones forming a line
                for stone_idx in range(3):
                    sx = cx - 80 + stone_idx * 80
                    sy = cy + int(15 * math.sin(t * 3.0 + stone_idx))
                    s_dist = math.hypot(x - sx, y - sy)
                    if s_dist < 22:
                        s_intensity = max(0.0, 1.0 - s_dist / 22.0)
                        if stone_idx % 2 == 0:
                            # Turquoise stone
                            r_base = int(20 * (1 - s_intensity) + 30 * s_intensity)
                            g_base = int(g_base * (1 - s_intensity) + 210 * s_intensity)
                            b_base = int(b_base * (1 - s_intensity) + 190 * s_intensity)
                        else:
                            # Ruby stone
                            r_base = int(r_base * (1 - s_intensity) + 235 * s_intensity)
                            g_base = int(g_base * (1 - s_intensity) + 50 * s_intensity)
                            b_base = int(b_base * (1 - s_intensity) + 70 * s_intensity)

                # Set 2x2 pixel block
                for oy in range(2):
                    if y + oy >= HEIGHT: break
                    row_offset = (y + oy) * WIDTH * 3
                    for ox in range(2):
                        if x + ox >= WIDTH: break
                        idx = row_offset + (x + ox) * 3
                        pixels[idx] = r_base
                        pixels[idx + 1] = g_base
                        pixels[idx + 2] = b_base

        # Header for PPM P6
        header = f"P6\n{WIDTH} {HEIGHT}\n255\n".encode("ascii")
        proc.stdin.write(header)
        proc.stdin.write(pixels)

    proc.stdin.close()
    proc.wait()

    # Apply text overlay filter with ffmpeg for pristine typography
    final_mp4 = "/tmp/final_tapsell_ad.mp4"
    overlay_cmd = [
        "ffmpeg", "-y",
        "-i", OUT_MP4,
        "-vf", (
            "drawtext=text='TAPSELL OFFICIAL AD':fontcolor=0xfcd34d:fontsize=32:x=(w-text_w)/2:y=40,"
            "drawtext=text='SPONSOR DOOZ IRANIAN':fontcolor=0xffffff:fontsize=22:x=(w-text_w)/2:y=80,"
            "drawtext=text='+100 GOLD COINS REWARD':fontcolor=0x34d399:fontsize=26:x=(w-text_w)/2:y=280,"
            "drawtext=text='TAPSELL ZONE VERIFIED':fontcolor=0xfbbf24:fontsize=16:x=(w-text_w)/2:y=320"
        ),
        "-c:v", "libx264",
        "-c:a", "copy",
        final_mp4
    ]
    subprocess.run(overlay_cmd, check=True)

    # Move to public and dist
    import shutil
    shutil.copy2(final_mp4, OUT_MP4)
    shutil.copy2(final_mp4, "/app/applet/dist/tapsell_ad.mp4")

    size_kb = os.path.getsize(OUT_MP4) / 1024
    print(f"SUCCESS: Created animated MP4 video at {OUT_MP4} and dist/ ({size_kb:.1f} KB)")

if __name__ == "__main__":
    main()
