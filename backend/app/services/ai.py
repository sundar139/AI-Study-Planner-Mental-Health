
import random

class AIService:
    def analyze_mood(self, mood_history: list) -> str:
        """
        Analyze mood history and return insights.
        In a real implementation, this would call OpenAI/Anthropic.
        """
        if not mood_history:
            return "No mood data available to analyze. Start logging your mood!"
        
        avg_score = sum([m.score for m in mood_history]) / len(mood_history)
        
        if avg_score >= 8:
            return "You're doing great! Keep up the positive momentum. Consider what's contributing to your happiness and try to maintain it."
        elif avg_score >= 5:
            return "You're doing okay. It's normal to have ups and downs. Try to identify small things that bring you joy."
        else:
            return "It seems like you're going through a tough time. Remember to take breaks and reach out to friends or family if you need support."

    def chat(self, message: str) -> str:
        """
        Simple chat response logic.
        """
        msg = message.lower()
        if "assignment" in msg or "homework" in msg:
            return "I can help you break down your assignments! Which one are you working on?"
        elif "schedule" in msg or "plan" in msg:
            return "I can help you plan your day. Would you like to generate a study schedule?"
        elif "stressed" in msg or "tired" in msg:
            return "I hear you. Remember to take short breaks using the Pomodoro technique. Have you checked in on the Well-Being page today?"
        else:
            return "I'm your AssignWell assistant. I can help with assignments, scheduling, and well-being tips. How can I help you today?"

ai_service = AIService()
