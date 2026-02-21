"""
Geofencing Utilities
Calculate distances and validate locations
"""

import math
from typing import Tuple
from app.core.config import settings


def calculate_distance(coord1: Tuple[float, float], coord2: Tuple[float, float]) -> float:
    """
    Calculate distance between two coordinates using Haversine formula
    
    Args:
        coord1: Tuple of (latitude, longitude) for first point
        coord2: Tuple of (latitude, longitude) for second point
        
    Returns:
        Distance in meters
    """
    lat1, lon1 = coord1
    lat2, lon2 = coord2
    
    # Earth's radius in meters
    R = 6371000
    
    # Convert to radians
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    # Haversine formula
    a = (math.sin(delta_phi / 2) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    distance = R * c
    
    return distance


def is_within_geofence(
    user_coords: Tuple[float, float],
    office_coords: Tuple[float, float],
    radius_meters: int = None
) -> bool:
    """
    Check if user coordinates are within geofence radius
    
    Args:
        user_coords: User's current coordinates (lat, lon)
        office_coords: Office coordinates (lat, lon)
        radius_meters: Geofence radius in meters (default from settings)
        
    Returns:
        True if within geofence, False otherwise
    """
    if radius_meters is None:
        radius_meters = settings.GEOFENCE_RADIUS_METERS
    
    distance = calculate_distance(user_coords, office_coords)
    return distance <= radius_meters


def validate_location_for_mode(
    latitude: float,
    longitude: float,
    work_mode: str
) -> Tuple[bool, str]:
    """
    Validate location based on work mode
    
    Args:
        latitude: User's latitude
        longitude: User's longitude
        work_mode: Work mode (OFFICE, BRANCH, FIELD, WFH)
        
    Returns:
        Tuple of (is_valid, reason)
    """
    user_coords = (latitude, longitude)
    
    if work_mode == "OFFICE":
        if not is_within_geofence(user_coords, settings.office_coordinates):
            distance = calculate_distance(user_coords, settings.office_coordinates)
            return False, f"Location outside office geofence. Distance: {distance:.0f}m"
    
    elif work_mode == "BRANCH":
        if not is_within_geofence(user_coords, settings.branch_coordinates):
            distance = calculate_distance(user_coords, settings.branch_coordinates)
            return False, f"Location outside branch geofence. Distance: {distance:.0f}m"
    
    elif work_mode in ["WFH", "FIELD"]:
        # For remote work, just ensure coordinates are not null/zero
        if latitude == 0 and longitude == 0:
            return False, "GPS coordinates required for remote work verification"
    
    return True, "Location verified"
