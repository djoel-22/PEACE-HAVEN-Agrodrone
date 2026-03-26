"""
services/weather_service.py — Weather Integration (Feature 6)
"""
import logging
from datetime import datetime

logger = logging.getLogger("agrodrone-weather")

SPRAYING_LIMITS = {
    "max_wind_kmh": 20,
    "max_humidity": 90,
    "min_visibility_km": 3,
}

def fetch_weather(city: str, api_key: str) -> dict:
    """Fetch weather from OpenWeatherMap and assess spraying safety."""
    fallback = _fallback(city)
    if not api_key:
        return fallback
    try:
        import requests
        r = requests.get(
            "http://api.openweathermap.org/data/2.5/weather",
            params={"q": f"{city},IN", "appid": api_key, "units": "metric"},
            timeout=6,
        )
        r.raise_for_status()
        d = r.json()
        wind_kmh    = round(d["wind"]["speed"] * 3.6, 1)
        humidity    = d["main"]["humidity"]
        visibility  = round(d.get("visibility", 10000) / 1000, 1)
        temp        = round(d["main"]["temp"], 1)
        feels_like  = round(d["main"]["feels_like"], 1)
        condition   = d["weather"][0]["main"]
        description = d["weather"][0]["description"].title()
        icon        = d["weather"][0]["icon"]
        rain_chance = _estimate_rain(condition)
        safe, reasons = _assess_safety(wind_kmh, humidity, visibility, condition)
        return {
            "city": city,
            "temperature": temp,
            "feels_like": feels_like,
            "humidity": humidity,
            "wind_speed": wind_kmh,
            "wind_direction": _wind_dir(d["wind"].get("deg", 0)),
            "visibility": visibility,
            "pressure": d["main"]["pressure"],
            "condition": description,
            "condition_main": condition,
            "condition_icon": icon,
            "rain_chance": rain_chance,
            "suitable_for_spraying": safe,
            "spray_warning": None if safe else "⚠️ " + "; ".join(reasons),
            "unsafe_reasons": reasons,
            "source": "OpenWeatherMap",
            "last_updated": datetime.utcnow().strftime("%d %b %Y, %I:%M %p UTC"),
            "temp_min": round(d["main"]["temp_min"], 1),
            "temp_max": round(d["main"]["temp_max"], 1),
        }
    except Exception as e:
        logger.warning(f"Weather fetch failed for {city}: {e}")
        return fallback

def _assess_safety(wind_kmh, humidity, visibility, condition):
    reasons = []
    if wind_kmh > SPRAYING_LIMITS["max_wind_kmh"]:
        reasons.append(f"Wind too high ({wind_kmh} km/h > {SPRAYING_LIMITS['max_wind_kmh']})")
    if humidity > SPRAYING_LIMITS["max_humidity"]:
        reasons.append(f"Humidity too high ({humidity}%)")
    if visibility < SPRAYING_LIMITS["min_visibility_km"]:
        reasons.append(f"Low visibility ({visibility} km)")
    if condition in ("Rain", "Thunderstorm", "Snow", "Drizzle"):
        reasons.append(f"Precipitation: {condition}")
    return len(reasons) == 0, reasons

def _estimate_rain(condition: str) -> int:
    mapping = {"Rain": 90, "Drizzle": 70, "Thunderstorm": 95, "Snow": 80,
               "Mist": 30, "Fog": 35, "Haze": 15, "Clear": 5, "Clouds": 20}
    return mapping.get(condition, 10)

def _wind_dir(deg: int) -> str:
    dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"]
    return dirs[round(deg / 22.5) % 16]

def _fallback(city: str) -> dict:
    return {
        "city": city, "temperature": 28, "feels_like": 31, "humidity": 65,
        "wind_speed": 8.0, "wind_direction": "NW", "visibility": 10.0,
        "pressure": 1012, "condition": "Partly Cloudy", "condition_main": "Clouds",
        "condition_icon": "02d", "rain_chance": 15,
        "suitable_for_spraying": True, "spray_warning": None, "unsafe_reasons": [],
        "source": "Estimated", "last_updated": datetime.utcnow().strftime("%d %b %Y, %I:%M %p UTC"),
        "temp_min": 24, "temp_max": 34,
    }
