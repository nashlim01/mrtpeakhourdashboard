# 🚇 MRT Kajang Line: Peak Hour Panic Simulator
*(a.k.a. "Uncle, Calm Down, Let Math Fix It")*

## 🎭 The Origin Story
On **April 24, 2026**, the Kajang Line decided to take an unscheduled nap right during PM peak hour. Cue the legendary Malaysian commuter experience: packed platforms, sweating commuters, and one very passionate uncle going off for a solid 15 minutes about how *“MRT always break down when everyone is rushing!”* 

While I nodded respectfully (and quietly agreed), a tiny voice in my head whispered:  
> *“What if we actually simulated this instead of just complaining?”*

Hence, this dashboard was born. It’s a personal “what-if” tool that models CBD disruption scenarios, tests backup strategies, and spits out actual numbers so we stop guessing and start planning.

## 🤝 The Co-Pilot & The Prompting Flex
I didn’t build this alone. Massive shoutout to all my AI partner-in-crime, who patiently endured my chaotic prompting sessions, helped me brainstorm the dashboard layout, and dove deep into transit math with me. We argued over formulas, stress-tested passenger flow metrics, and basically treated peak-hour capacity like a boss battle. 

If you think my prompting output is decent… yeah, I’m weirdly proud of it ngl. 😎

## 📊 What This Actually Does
This is a single-file React dashboard that simulates CBD disruption scenarios on the Kajang Line (`Kwasa Damansara → Kajang`). You can:
- ✏️ Edit station boarding/alighting data in real-time
- ⚠️ Toggle a `2.8× disruption multiplier` on key CBD interchanges
- 🔄 Compare **6 mitigation strategies** (Baseline, Skip-Stop, Express Overlay, Dynamic Headway, Zonal Turn-Back, Gate Metering)
- 📈 View congestion heatmaps, wait-time deltas, overflow counts, and a ranked verdict matrix

No build step. No npm install. Just open `index.html` and simulate.

## 🧮 The Math (No PhD Required)
For the nerdy part (I promise it’s painless), here’s how the dashboard actually crunches numbers:

### 🔹 Train Load Tracking
load = previous_load + board - alight  // clamped to ≥ 0
- Trains don’t magically spawn or delete passengers. We track cumulative load station-by-station so you can see exactly where the train starts choking.

### 🔹 Headway Calculation (Single-Track, End-to-End)
Instead of assuming trains do instant round-trips, we model directional routing:
headway (min) = (travel_time + dwell_time + layover) / trains_per_direction
- This matters because 4 trains on one direction ≠ 4 trains doing a full loop. Real transit math > Excel assumptions.

### 🔹 Capacity Per Hour
capPerHour = floor((60 / headway) × 1200)
- If a train shows up every 18 minutes, you’re not moving 1,200 pax every minute. (Unless it’s a time machine.)

### 🔹 Disruption Stress Test
Key CBD interchanges get a 2.8× boarding surge, and existing train load gets a 1.4× multiplier. Why? Because when one line fails, everyone dumps onto the next. It’s not theoretical, it’s Tuesday.

### 🔹 Strategy Metrics
Every strategy runs through the same pipeline so we’re comparing apples to apples:

- Overflow - max(0, demand - capacity) - How many pax/hr get left behind
- Congestion - load / 1200 - How squished the train is (1.0 = full, >1.0 = shoulder surfing)
- Avg Wait - headway / 2 - Statistical average wait (you arrive halfway between trains)
- Throughput - sum(min(demand, capacity)) - How many people actually get moved
- Transfer Safety - Qualitative score (1–5) - Does this strategy strand interchange passengers?

All 6 strategies are evaluated against these exact metrics. No vibes. Just math.

### 🚀 How to Run It

```bash
Python 3
python3 -m http.server 8000

 OR
 
Node.js
npx serve .

Then open:
http://localhost:[dedicated_port]
```

(You can also just double-click index.html, but some browsers throw CORS fits. A local server takes 10 seconds and saves you the headache.)


📬 RapidKL, This Is Your Sign
I built this as a personal side-project, but hey—if anyone from RapidKL, MRT Corp, or transit planning stumbles across this, slide into my LinkedIn. I’d love to chat, share the raw data, or just grab teh tarik and talk about why peak-hour ops are basically applied chaos theory. 👀

And for the others, feel free to send in your thought and refine this codebase as if you guys want to voice out more and see how we can play the maths and time with the MRT.

Built with React 18, Babel Standalone, and an unhealthy amount of public transport anxiety.
Single-track end-to-end optimized · PM Peak Hour Simulation · 4 Backup Trains (2/dir)
MIT License • Use it, break it, fix it, make it run faster than the actual MRT. 🚇✨
