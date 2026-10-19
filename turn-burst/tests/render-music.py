"""Render the actual Web Audio voice specifications for a portable WAV preview.

The browser remains the authoritative renderer. The offline preview approximates
its band-limited oscillators and biquad filters; it does not emulate compression.
"""
import json, sys
from pathlib import Path
import numpy as np
from scipy.signal import lfilter
from scipy.io.wavfile import write

RATE = 32000
output = Path(sys.argv[1])

def coefficients(cutoff, highpass=False):
    w = 2 * np.pi * cutoff / RATE
    alpha = np.sin(w) / (2 * .65)
    c = np.cos(w)
    b = np.array([(1+c)/2, -(1+c), (1+c)/2] if highpass else [(1-c)/2, 1-c, (1-c)/2])
    a = np.array([1+alpha, -2*c, 1-alpha])
    return b/a[0], a/a[0]

def biquad(signal, cutoff, highpass=False, end=None, duration=None):
    if end is None:
        b,a=coefficients(cutoff,highpass)
        return lfilter(b,a,signal)
    result=np.zeros(len(signal)); state=np.zeros(2)
    for first in range(0,len(signal),64):
        last=min(first+64,len(signal))
        current=cutoff*(end/cutoff)**min((first+32)/RATE/duration,1)
        b,a=coefficients(current,highpass)
        result[first:last],state=lfilter(b,a,signal[first:last],zi=state)
    return result

reports = []
for track in json.loads(Path(sys.argv[2]).read_text()):
    seconds = track['seconds']
    length = int(round(seconds * RATE))
    dry = np.zeros((length + RATE*2, 2), dtype=np.float64)
    send = np.zeros(length + RATE*2, dtype=np.float64)
    seed = 314159
    noise = np.empty(RATE)
    for i in range(RATE):
        seed = (seed * 1664525 + 1013904223) & 0xffffffff
        noise[i] = (seed if seed < 0x80000000 else seed-0x100000000) / 2147483648
    for v in track['voices']:
        d, release = v['d'], v.get('release', .025)
        attack = min(v.get('attack', .004), d*.4)
        time = np.arange(int(np.ceil((d+release)*RATE))) / RATE
        if v.get('noise'):
            wave = noise[:len(time)].copy()
        else:
            freq = np.full(len(time), v.get('freq', 440.), dtype=np.float64)
            if 'end' in v:
                freq *= np.exp(np.minimum(time/d, 1)*np.log(v['end']/v['freq']))
            if v.get('vibrato'):
                points = np.r_[0, .08, np.arange(.11, d, .045), d+release]
                values = np.ones(len(points)); values[2:-1] += np.sin(points[2:-1]*38)*.0028
                values[-1] = values[-2]
                freq *= np.interp(time, points, values)
            phase = 2*np.pi*np.cumsum(freq)/RATE
            kind = v.get('type', 'sine')
            if kind == 'sine':
                wave = np.sin(phase)
            elif kind == 'triangle':
                wave = np.zeros(len(time))
                for k in range(1, min(33, int(RATE/2/max(freq))), 2):
                    wave += (-1)**((k-1)//2)*np.sin(phase*k)/k**2*8/np.pi**2
            elif kind == 'square':
                wave = np.zeros(len(time))
                for k in range(1, min(33, int(RATE/2/max(freq))), 2):
                    wave += np.sin(phase*k)/k*4/np.pi
            else:
                wave = np.zeros(len(time))
                for k in range(1, min(33, int(RATE/2/max(freq)))):
                    wave += (-1)**(k+1)*np.sin(phase*k)/k*2/np.pi
        if v.get('drive'):
            wave = np.tanh(wave*3.5)/np.tanh(3.5)
        if 'cutoff' in v:
            wave = biquad(wave, v['cutoff'], v.get('filter') == 'highpass',v.get('cutoffEnd'),d)
        volume = v['volume']
        sustain = max(.0001, volume*v.get('sustain',.65))
        env = np.interp(time, [0, attack], [.0001, volume])
        decay = time > attack
        env[decay] = volume * (sustain/volume)**np.minimum((time[decay]-attack)/(d-attack), 1)
        tail = time > d
        env[tail] = sustain * (.0001/sustain)**((time[tail]-d)/release)
        wave *= env
        first = int(round(v['t']*RATE)); last = first+len(wave)
        angle = (v.get('pan', 0)+1)*np.pi/4
        dry[first:last, 0] += wave*np.cos(angle)
        dry[first:last, 1] += wave*np.sin(angle)
        if v.get('echo'):
            send[first:last] += wave
    delay = int(round(track['delay']*RATE))
    for i in range(1, 7):
        offset = delay*i
        dry[offset:] += (send[:-offset]*(.17*.18**(i-1))/np.sqrt(2))[:,None]
    # Wrap note releases and echo into the start for a directly loopable preview.
    dry[:len(dry)-length] += dry[length:]
    samples = dry[:length]*.85*.6
    peak = float(np.max(np.abs(samples)))
    rms = float(np.sqrt(np.mean(samples**2)))
    assert peak < .95 and rms > .015, (peak, rms)
    name = 'turn-burst-'+track['mode']+'.wav'
    write(output/name, RATE, (np.clip(samples, -1, 1)*32767).astype(np.int16))
    reports.append(dict(mode=track['mode'],seconds=seconds,peak=peak,rms=rms,file=name,clipped_samples=int(np.sum(np.abs(samples)>=1))))
(output/'music-analysis.json').write_text(json.dumps(reports, indent=2)+'\n')
print(json.dumps(reports, indent=2))
