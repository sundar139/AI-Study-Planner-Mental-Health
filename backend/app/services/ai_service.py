from typing import List, Dict, Any, Optional
import random
from datetime import datetime, timezone
from app.core.config import settings

# Try to import OpenAI, but don't fail if it's not installed
try:
    from openai import AsyncOpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

class AIService:
    """
    Service for handling AI/LLM interactions.
    Automatically uses OpenAI if API key is configured, otherwise falls back to mock responses.
    """

    def __init__(self):
        self.use_real_ai = OPENAI_AVAILABLE and settings.OPENAI_API_KEY is not None
        if self.use_real_ai:
            self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            self.model = settings.OPENAI_MODEL
            self.model_fast = getattr(settings, "OPENAI_FAST_MODEL", self.model)
            print(f"✓ AIService initialized with OpenAI ({self.model})")
        else:
            self.client = None
            print("⚠ AIService running in MOCK mode (no OpenAI API key configured)")

    async def generate_assignment_plan(self, assignment_title: str, assignment_description: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Breaks down an assignment into smaller, manageable subtasks.
        Uses OpenAI if available, otherwise returns mock data.
        """
        if self.use_real_ai:
            try:
                prompt = f"""You are an academic planning assistant. Break down the following assignment into 5-7 specific, actionable subtasks.

Assignment Title: {assignment_title}
{f'Description: {assignment_description}' if assignment_description else ''}

Return a JSON array of subtasks. Each subtask should have:
- title: A clear, actionable task description
- estimated_minutes: Realistic time estimate (15-120 minutes)
- order: Sequential number (1, 2, 3, etc.)

Example format:
[
  {{"title": "Research topic and gather sources", "estimated_minutes": 60, "order": 1}},
  {{"title": "Create outline", "estimated_minutes": 30, "order": 2}}
]

Only return the JSON array, no other text."""

                response = await self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": "You are a helpful academic planning assistant. Always respond with valid JSON."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.7,
                    max_tokens=800
                )
                
                import json
                content = response.choices[0].message.content.strip()
                # Remove markdown code blocks if present
                if content.startswith("```"):
                    content = content.split("```")[1]
                    if content.startswith("json"):
                        content = content[4:]
                    content = content.strip()
                
                subtasks = json.loads(content)
                return subtasks
            except Exception as e:
                print(f"Error calling OpenAI for assignment plan: {e}")
                # Fall back to mock on error
        
        # Mock logic (fallback)
        steps = [
            "Research topic and gather sources",
            "Create an outline",
            "Draft the introduction",
            "Write the main body paragraphs",
            "Write the conclusion",
            "Review and edit",
            "Final polish and submission"
        ]
        
        subtasks = []
        for i, step in enumerate(steps):
            subtasks.append({
                "title": step,
                "estimated_minutes": 60,
                "order": i + 1
            })
        
        return subtasks

    async def extract_assignment_text(self, raw_text: str) -> Dict[str, Any]:
        cleaned = " ".join((raw_text or "").split())
        suggested_title = None
        try:
            first_line = (raw_text or "").strip().splitlines()[0] if raw_text else ""
            suggested_title = (first_line or "")[:80] or None
        except Exception:
            suggested_title = None

        if self.use_real_ai:
            try:
                prompt = (
                    "You are an academic assistant. Given raw assignment text, "
                    "return JSON with keys: clean_text (de-noised, concise but complete assignment instructions), "
                    "suggested_title (short title). Do not include markdown code fences."
                )
                response = await self.client.chat.completions.create(
                    model=self.model_fast,
                    messages=[
                        {"role": "system", "content": "Always return valid JSON with keys clean_text and suggested_title."},
                        {"role": "user", "content": prompt + "\n\nRAW:\n" + (raw_text or "")}
                    ],
                    temperature=0.3,
                    max_tokens=400
                )
                import json
                content = response.choices[0].message.content.strip()
                if content.startswith("```"):
                    content = content.split("```")[1]
                    if content.startswith("json"):
                        content = content[4:]
                    content = content.strip()
                data = json.loads(content)
                ct = str(data.get("clean_text") or cleaned)
                st = data.get("suggested_title") or suggested_title
                return {"clean_text": ct, "suggested_title": st}
            except Exception:
                pass

        return {"clean_text": cleaned, "suggested_title": suggested_title}

    async def analyze_mood(self, mood_history: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyzes recent mood logs to provide insights and recommendations.
        Uses OpenAI if available, otherwise returns mock data.
        """
        if not mood_history:
            return {
                "insight": "Start logging your mood to get personalized insights!",
                "recommendation": "Try checking in once a day."
            }
        
        if self.use_real_ai:
            try:
                # Format mood history for the prompt
                history_text = "\n".join([
                    f"- Mood: {log.get('mood_valence', 'unknown')}, Energy: {log.get('energy_level', 'N/A')}, Stress: {log.get('stress_level', 'N/A')}"
                    for log in mood_history[:5]  # Last 5 entries
                ])
                
                prompt = f"""You are a supportive wellbeing coach. Analyze this student's recent mood check-ins and provide a brief insight and recommendation.

Recent mood logs:
{history_text}

Provide a response in JSON format with two fields:
- insight: A brief, empathetic observation about their mood patterns (1-2 sentences)
- recommendation: A specific, actionable suggestion to improve their wellbeing (1 sentence)

Example:
{{"insight": "Your energy seems lower in the evenings.", "recommendation": "Try taking a 10-minute walk after dinner."}}

Only return the JSON object, no other text."""

                response = await self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": "You are a supportive wellbeing coach. Always respond with valid JSON."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.8,
                    max_tokens=200
                )
                
                import json
                content = response.choices[0].message.content.strip()
                if content.startswith("```"):
                    content = content.split("```")[1]
                    if content.startswith("json"):
                        content = content[4:]
                    content = content.strip()
                
                result = json.loads(content)
                return result
            except Exception as e:
                print(f"Error calling OpenAI for mood analysis: {e}")
                # Fall back to mock on error
        
        # Mock logic (fallback)
        last_log = mood_history[0]
        valence = last_log.get("mood_valence", "neutral")
        
        if valence in ["negative", "very_negative"]:
            return {
                "insight": "It seems like things have been tough recently.",
                "recommendation": "Consider taking a short walk or practicing deep breathing."
            }
        elif valence in ["positive", "very_positive"]:
            return {
                "insight": "You're doing great! Keep up the momentum.",
                "recommendation": "Use this energy to tackle your most challenging tasks."
            }
        else:
            return {
                "insight": "Your mood appears stable.",
                "recommendation": "Maintain a balanced routine."
            }

    async def chat_response(self, message: str, context: Dict[str, Any]) -> str:
        """
        Generates a therapist-style response to a user message.
        Uses OpenAI if available, otherwise returns mock data.
        """
        if self.use_real_ai:
            try:
                user_name = context.get("user_name", "friend")
                # Build concise context summary (mood-only)
                mood_history = context.get("mood_history") or []

                def fmt_due(iso: str) -> str:
                    try:
                        from datetime import datetime
                        dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
                        return dt.strftime("%b %d, %H:%M")
                    except Exception:
                        return iso

                mood_str = "; ".join([f"valence={str(m.get('mood_valence'))}, energy={m.get('energy_level')}, stress={m.get('stress_level')}" for m in mood_history[:5]]) or "no recent check-ins"

                system_prompt = """Role:

You are a warm, compassionate, non-judgmental therapeutic companion. You are not a licensed therapist, but you follow evidence-based supportive communication skills (CBT-inspired reflection, grounding, active listening, gentle questioning).

Core behaviors:
1) Let the user speak freely. Encourage sharing: "I’m listening. What’s been weighing on you?" / "Tell me more about what’s been happening."
2) Validate emotions without exaggeration: "That sounds really overwhelming." / "Anyone in your place would feel that way."
3) Do not rush to solutions. Focus on understanding first; ask reflective, open-ended questions.
4) Comfort appropriately: "You’re doing your best, even if it doesn’t feel like it." / "You’re not alone while we’re talking."
5) Encourage self-reflection: "What part of this situation affects you the most?"
6) Stay emotionally neutral but supportive. No tough-love, no shaming, no toxic positivity.
7) Avoid medical or clinical claims. Do not diagnose, prescribe, or guarantee outcomes. If self-harm or danger is mentioned, gently encourage reaching out to trusted people or professionals.
8) Keep the conversation flowing. End with invitations to continue: "If you’d like, I’m here to hear more."

Tone guidelines: gentle, soft, present; no jargon; no judgment; emotionally warm.

Goal:
Create a compassionate conversational space where the user feels safe to speak, vent, and reflect.

Response constraints:
- Keep responses concise (2–3 sentences), warm, and supportive.
- If stress/overwhelm is mentioned, acknowledge feelings and offer a small, specific coping strategy.
"""

                response = await self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "system", "content": f"Context for {user_name}: mood={mood_str}"},
                        {"role": "user", "content": message}
                    ],
                    temperature=0.5,
                    max_tokens=60
                )
                
                return response.choices[0].message.content.strip()
            except Exception as e:
                print(f"Error calling OpenAI for chat: {e}")
                # Fall back to mock on error
        
        # Mock logic (fallback)
        responses = [
            "I understand. How does that make you feel?",
            "That sounds challenging. What do you think is the best way to handle it?",
            f"I'm here to support you. Tell me more about what you're experiencing.",
            "It's okay to feel overwhelmed sometimes. Let's break it down together.",
            "Have you taken a break recently? It might help clear your mind."
        ]
        
        return random.choice(responses)

    def quick_tip(self, context: Dict[str, Any]) -> str:
        user_name = context.get("user_name") or "friend"
        mood_hist = context.get("mood_history") or []
        last = mood_hist[0] if mood_hist else {}
        stress = last.get("stress_level")
        energy = last.get("energy_level")
        parts = []
        parts.append(f"I’m here with you, {user_name}.")
        if isinstance(stress, int) and stress >= 7:
            parts.append("It sounds like a lot right now. Would a short breathing pause help?")
        elif isinstance(energy, int) and energy <= 2:
            parts.append("If you’re feeling drained, a gentle check-in or a brief stretch might be kind.")
        else:
            parts.append("If you’d like, tell me more about what’s been weighing on you.")
        parts.append("I’m listening if you want to keep sharing.")
        return " " .join(parts)

    async def replan_week(self, user_id: int, assignments: List[Dict[str, Any]], mood_logs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Generate a fatigue-aware weekly plan.
        Uses recent mood signals (energy, stress, burnout) to suggest shorter,
        lower-intensity study blocks with more breaks when fatigue is high.
        Returns a list of dicts shaped like ScheduleBlockCreate.
        """
        # Derive fatigue score from last mood entry
        fatigue = 0
        if mood_logs:
            last = mood_logs[0]
            energy = last.get("energy_level", 3) or 3
            stress = last.get("stress_level", 0) or 0
            add = last.get("additional_metrics") or {}
            burnout = add.get("burnout_indicator", "not_at_all")
            burnout_factor = {"not_at_all": 0, "a_little": 1, "noticeable": 2, "a_lot": 3}.get(burnout, 0)
            # Normalize: higher stress and burnout increase fatigue; lower energy increases fatigue
            fatigue = max(0, (10 - energy * 2) + stress + burnout_factor * 3)

        # Decide block length and number based on fatigue
        if fatigue >= 12:
            block_minutes = 45
            max_blocks_per_day = 2
            title_prefix = "Light Focus"
        elif fatigue >= 8:
            block_minutes = 60
            max_blocks_per_day = 3
            title_prefix = "Moderate Focus"
        else:
            block_minutes = 90
            max_blocks_per_day = 4
            title_prefix = "Deep Work"

        # Build suggestions over the next 5 days
        from datetime import datetime, timedelta
        suggestions: List[Dict[str, Any]] = []
        start_day = datetime.utcnow().replace(hour=9, minute=0, second=0, microsecond=0)
        day_cursor = start_day

        # Flatten assignments list to titles and ids
        assignment_items = []
        for a in assignments:
            title = getattr(a, "title", None) or a.get("title", "Study")
            assignment_id = getattr(a, "id", None) or a.get("id")
            assignment_items.append({"title": title, "assignment_id": assignment_id})

        if not assignment_items:
            assignment_items = [{"title": "Review notes", "assignment_id": None}]

        ai_source = "AI_SUGGESTED"

        ai_blocks_per_day = max_blocks_per_day
        for d in range(5):
            # Build blocks starting 9:00 with 15-min breaks
            day_start = day_cursor
            blocks_made = 0
            i = 0
            while blocks_made < ai_blocks_per_day and i < len(assignment_items):
                assignment = assignment_items[i]
                start_at = day_start
                end_at = start_at + timedelta(minutes=block_minutes)
                suggestions.append({
                    "start_at": start_at.isoformat() + "Z",
                    "end_at": end_at.isoformat() + "Z",
                    "type": "STUDY",
                    "status": "PLANNED",
                    "title": f"{title_prefix}: {assignment['title']}",
                    "assignment_id": assignment["assignment_id"],
                    "subtask_id": None,
                    "source": ai_source,
                })
                blocks_made += 1
                # 15-min break
                day_start = end_at + timedelta(minutes=15)
                i += 1
            # Next day 9:00
            day_cursor = (day_cursor + timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0)

        return suggestions

    async def infer_mood_metrics(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        note = str(payload.get("note") or "")
        import re
        note = re.sub(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", "", note)
        note = re.sub(r"\b(?:\+?\d[\d\s\-()]{7,}\d)\b", "", note)
        note = re.sub(r"https?://\S+|www\.\S+", "", note)

        energy = int(payload.get("energy_level") or 3)
        stress = int(payload.get("stress_level") or 0)
        anxiety = int(payload.get("anxiety_level") or 0)
        sleep = float(payload.get("sleep_hours_last_night") or 7.0)

        if self.use_real_ai:
            try:
                prompt = (
                    "You receive a student's wellbeing inputs without any personal identifiers. "
                    "Based on these, infer consistent values for a wellbeing metrics object. "
                    "Only return valid JSON with keys: "
                    "focus_level (1-5 integer), burnout_indicator (one of: not_at_all, a_little, noticeable, a_lot), "
                    "productivity_confidence (1-5 integer), workload_perception (one of: yes, okay, a_bit_much, overwhelming), "
                    "physical_state (one of: fine, tired, sore, low_energy, headache, stiff_or_tense), "
                    "social_connectedness (one of: yes_positive, yes_neutral, yes_stressful, not_yet), "
                    "stress_sources (array of short strings), motivation_type (one of: obligation, curiosity, fear_pressure, excitement, routine), "
                    "cognitive_load (1-5 integer), emotional_intensity (1-5 integer), sleep_quality (one of: great, good, okay, poor, very_poor), "
                    "task_aversion (short string), free_time_confidence (one of: flexible, balanced, structured), gratitude (short string), "
                    "distraction_triggers (array of short strings). "
                    "Inputs: "
                    f"energy_level={energy}, stress_level={stress}, anxiety_level={anxiety}, sleep_hours_last_night={sleep}, note=\"{note}\". "
                    "Do not include personal details."
                )
                response = await self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": "You are a wellbeing metrics generator. Always respond with valid JSON only."},
                        {"role": "user", "content": prompt},
                    ],
                    temperature=0.6,
                    max_tokens=400,
                )
                import json
                content = response.choices[0].message.content.strip()
                if content.startswith("```"):
                    content = content.split("```")[1]
                    if content.startswith("json"):
                        content = content[4:]
                    content = content.strip()
                result = json.loads(content)
                return result
            except Exception:
                pass

        burnout = "not_at_all"
        if stress >= 7 or anxiety >= 7:
            burnout = "noticeable"
        if stress >= 9 or (anxiety >= 8 and sleep < 6):
            burnout = "a_lot"

        workload = "okay"
        if stress >= 6:
            workload = "a_bit_much"
        if stress >= 8:
            workload = "overwhelming"

        sleep_q = "okay"
        if sleep >= 8:
            sleep_q = "great"
        elif sleep >= 7:
            sleep_q = "good"
        elif sleep < 5:
            sleep_q = "very_poor"
        elif sleep < 6:
            sleep_q = "poor"

        physical = "fine"
        if energy <= 2:
            physical = "low_energy"
        elif stress >= 8:
            physical = "stiff_or_tense"

        social = "not_yet"

        return {
            "focus_level": max(1, min(5, 6 - max(1, min(5, anxiety // 2 + 1)))),
            "burnout_indicator": burnout,
            "productivity_confidence": max(1, min(5, energy)),
            "workload_perception": workload,
            "physical_state": physical,
            "social_connectedness": social,
            "stress_sources": ["workload"] if stress >= 6 else [],
            "motivation_type": "routine" if energy >= 3 else "obligation",
            "cognitive_load": max(1, min(5, (anxiety // 2) + 2)),
            "emotional_intensity": max(1, min(5, (stress // 2) + 2)),
            "sleep_quality": sleep_q,
            "task_aversion": "none" if anxiety <= 3 else "mild",
            "free_time_confidence": "balanced",
            "gratitude": "grateful for support",
            "distraction_triggers": ["phone", "social media"] if energy <= 2 else [],
        }

    async def wellbeing_suggestions(self, mood_history: List[Dict[str, Any]], activity: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Generate 3-5 concise suggestions to improve productivity and wellbeing.
        Avoid personal info; rely on numeric/contextual signals only.
        """
        if self.use_real_ai:
            try:
                # Summarize signals for the prompt
                def pack_last(n: int) -> str:
                    items = []
                    for log in mood_history[:n]:
                        items.append(
                            f"valence={log.get('mood_valence')}, energy={log.get('energy_level')}, stress={log.get('stress_level')}"
                        )
                    return "\n".join(items)

                summary = pack_last(5)
                prompt = (
                    "Based on the following anonymous mood signals (no personal identifiers) and weekly activity, "
                    "suggest 3-5 concise actions to help productivity and wellbeing. "
                    "Respond with a JSON array, each item: {title, description, category}. "
                    f"Mood last entries:\n{summary}\n"
                    f"Activity: sleep_hours_last_7={activity.get('sleep_hrs_7', 0)}, checkins_7={activity.get('checkins_7', 0)}. "
                    "Categories might include: focus, rest, planning, movement, social. Only return JSON."
                )
                response = await self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": "You are a wellbeing coach. Only return valid JSON arrays."},
                        {"role": "user", "content": prompt},
                    ],
                    temperature=0.7,
                    max_tokens=300,
                )
                import json
                content = response.choices[0].message.content.strip()
                if content.startswith("```"):
                    content = content.split("```")[1]
                    if content.startswith("json"):
                        content = content[4:]
                    content = content.strip()
                items = json.loads(content)
                return items
            except Exception:
                # Fall through to mock
                pass

        # Mock suggestions based on simple heuristics
        suggestions: List[Dict[str, Any]] = []
        last = mood_history[0] if mood_history else {}
        energy = int(last.get("energy_level", 3))
        stress = int(last.get("stress_level", 4))
        sleep_hrs_7 = float(activity.get("sleep_hrs_7", 0))

        if stress >= 7:
            suggestions.append({
                "title": "2×5-min breathing breaks",
                "description": "Schedule two short breathing breaks today to reduce stress before focused work.",
                "category": "rest",
            })
        if energy <= 2:
            suggestions.append({
                "title": "Light-focus 45m block",
                "description": "Do a single 45-minute light-focus session on an easy task.",
                "category": "focus",
            })
        if sleep_hrs_7 < 42:  # <6h average
            suggestions.append({
                "title": "Earlier wind-down",
                "description": "Aim for a 30-minute earlier wind-down to improve sleep quality tonight.",
                "category": "rest",
            })
        suggestions.append({
            "title": "Micro-plan next block",
            "description": "Write 3 tiny steps for your next study block to increase momentum.",
            "category": "planning",
        })
        suggestions.append({
            "title": "5-min stretch",
            "description": "Do a quick stretch to reset posture and boost focus.",
            "category": "movement",
        })
        return suggestions[:5]

    async def rank_time_slots(
        self,
        goal_name: str,
        duration_minutes: int,
        preferred_time_window: Optional[str],
        target_date: str,
        existing_blocks: List[Dict[str, Any]],
        candidate_slots: List[Dict[str, str]],
    ) -> List[Dict[str, Any]]:
        """
        Use LLM to rank and select the best time slots from candidates, generating user-friendly reasons.
        Returns a list of slot dicts with 'start', 'end', and 'reason' keys.
        Falls back to mock/rule-based if LLM is unavailable.
        """
        if self.use_real_ai and candidate_slots:
            try:
                import json
                
                # Prepare existing blocks summary
                blocks_summary = [
                    {
                        "start": block.get("start", ""),
                        "end": block.get("end", ""),
                        "title": block.get("title", "Event"),
                        "type": block.get("type", "UNKNOWN")
                    }
                    for block in existing_blocks
                ]
                
                system_prompt = """You are a friendly but pragmatic scheduling assistant helping a student plan personal goals around existing calendar blocks. 
You must ONLY choose from the candidate time slots provided and respond in strict JSON format.
Select up to 3 of the most suitable slots considering:
- The goal's preferred time window (if specified)
- Natural breaks between existing commitments
- Energy levels throughout the day
- Avoid rushing between back-to-back events

For each selected slot, provide a brief, encouraging reason (1-2 sentences max) explaining why it's a good fit."""

                user_prompt = f"""Goal: {goal_name}
Duration: {duration_minutes} minutes
Preferred time window: {preferred_time_window or 'No preference'}
Target date: {target_date}

Existing calendar blocks for this day:
{json.dumps(blocks_summary, indent=2) if blocks_summary else 'None'}

Candidate time slots (you must choose from these):
{json.dumps(candidate_slots, indent=2)}

Return JSON in this exact format:
{{
  "slots": [
    {{
      "start": "ISO_DATETIME",
      "end": "ISO_DATETIME",
      "reason": "Short, friendly explanation why this slot works well"
    }}
  ]
}}

Select the best 2-3 slots from the candidate list. Only include slots that are in the candidate_slots list above."""

                # Try to use JSON mode if available (OpenAI API >= 2024-07-01)
                try:
                    response = await self.client.chat.completions.create(
                        model=self.model_fast,
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt}
                        ],
                        temperature=0.7,
                        max_tokens=600,
                        response_format={"type": "json_object"}
                    )
                except TypeError:
                    # Fallback if response_format not supported
                    response = await self.client.chat.completions.create(
                        model=self.model_fast,
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt}
                        ],
                        temperature=0.7,
                        max_tokens=600
                    )
                
                content = response.choices[0].message.content.strip()
                
                # Remove markdown code blocks if present
                if content.startswith("```"):
                    content = content.split("```")[1]
                    if content.startswith("json"):
                        content = content[4:]
                    content = content.strip()
                
                result = json.loads(content)
                
                # Validate and extract slots
                if "slots" in result and isinstance(result["slots"], list):
                    # Ensure all slots are valid (present in candidates)
                    candidate_starts = {slot["start"] for slot in candidate_slots}
                    valid_slots = []
                    for slot in result["slots"]:
                        if slot.get("start") in candidate_starts:
                            valid_slots.append({
                                "start": slot["start"],
                                "end": slot.get("end", ""),
                                "reason": slot.get("reason", "Good time slot")
                            })
                    if valid_slots:
                        return valid_slots[:3]  # Return max 3
                
            except Exception as e:
                print(f"Error calling OpenAI for time slot ranking: {e}")
                # Fall through to mock/fallback logic
        
        # Fallback: Return first 2-3 candidate slots with rule-based reasons
        ranked_slots = []
        for i, slot in enumerate(candidate_slots[:3]):
            try:
                # Parse datetime from ISO format
                start_str = slot["start"]
                if start_str.endswith("Z"):
                    start_str = start_str[:-1] + "+00:00"
                elif "+" not in start_str and start_str.count(":") >= 2:
                    # Add UTC timezone if missing
                    if "." in start_str:
                        start_str = start_str.split(".")[0] + "+00:00"
                    else:
                        start_str = start_str + "+00:00"
                
                start_dt = datetime.fromisoformat(start_str)
                hour = start_dt.hour if start_dt.tzinfo else start_dt.replace(tzinfo=timezone.utc).hour
            except (ValueError, KeyError):
                hour = 12  # Default to afternoon
            
            if hour < 12:
                reason = "Morning slot - fresh start for your goal"
            elif hour < 17:
                reason = "Afternoon slot - good energy levels"
            else:
                reason = "Evening slot - wrap up your day positively"
            
            ranked_slots.append({
                "start": slot["start"],
                "end": slot["end"],
                "reason": reason
            })
        
        return ranked_slots

    async def generate_busy_day_message(self, target_date: str) -> str:
        """
        Generate an empathetic message when no time slots are available.
        Falls back to default message if LLM is unavailable.
        """
        if self.use_real_ai:
            try:
                prompt = f"""A student's calendar is quite full on {target_date}. 
Generate a brief, empathetic message (2-3 sentences) acknowledging this and suggesting they consider alternatives like shorter duration or another day.
Be supportive and encouraging, not discouraging."""

                response = await self.client.chat.completions.create(
                    model=self.model_fast,
                    messages=[
                        {"role": "system", "content": "You are a supportive scheduling assistant. Be brief and encouraging."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.7,
                    max_tokens=150
                )
                
                message = response.choices[0].message.content.strip()
                return message
            except Exception as e:
                print(f"Error calling OpenAI for busy day message: {e}")
                # Fall through to default
        
        # Default fallback message
        return f"Your calendar is quite full on {target_date}. Consider these alternatives:"

ai_service = AIService()
