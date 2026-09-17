"""Prompt Builder for ScholarHub AI Matching.

Constructs sanitized, deterministic prompt payloads for Gemini AI evaluation.
Strictly excludes sensitive credentials, tokens, emails, and database keys.
"""

from typing import Any, Dict, List, Optional
from uuid import UUID

from app.models.profile import AcademicProfile, FinancialPreference, StudentProfile
from app.models.scholarship import Scholarship, ScholarshipRequirement


class PromptBuilder:
    """Deterministic prompt generator for scholarship eligibility matching."""

    @staticmethod
    def sanitize_student_data(
        personal_profile: Optional[StudentProfile] = None,
        academic_profile: Optional[AcademicProfile] = None,
        financial_preference: Optional[FinancialPreference] = None,
    ) -> Dict[str, Any]:
        """Build a strictly sanitized student context dictionary.

        Explicitly excludes:
        - password_hash
        - access token / JWT
        - email addresses
        - database primary keys / UUIDs
        - contact numbers
        """
        student_data: Dict[str, Any] = {
            "personal": {},
            "academic": {},
            "financial": {},
        }

        if personal_profile:
            student_data["personal"] = {
                "first_name": personal_profile.first_name,
                "gender": personal_profile.gender or "Not specified",
                "country": personal_profile.country or "Not specified",
                "state": personal_profile.state or "Not specified",
                "district": personal_profile.district or "Not specified",
                "city": personal_profile.city or "Not specified",
            }

        if academic_profile:
            student_data["academic"] = {
                "course": academic_profile.course or "Not specified",
                "branch": academic_profile.branch or "Not specified",
                "current_year": academic_profile.current_year or "Not specified",
                "university": academic_profile.university or "Not specified",
                "college": academic_profile.college or "Not specified",
                "cgpa": float(academic_profile.cgpa) if academic_profile.cgpa is not None else None,
                "previous_percentage": (
                    float(academic_profile.previous_percentage)
                    if academic_profile.previous_percentage is not None
                    else None
                ),
            }

        if financial_preference:
            study_pref_str = (
                financial_preference.study_preference.value
                if financial_preference.study_preference
                else "Not specified"
            )
            student_data["financial"] = {
                "reservation_category": financial_preference.reservation_category or "General",
                "special_categories": financial_preference.special_categories or [],
                "family_income_inr": (
                    float(financial_preference.family_income)
                    if financial_preference.family_income is not None
                    else None
                ),
                "study_preference": study_pref_str,
            }

        return student_data

    @staticmethod
    def sanitize_scholarship_data(
        scholarship: Scholarship,
        requirements: Optional[List[ScholarshipRequirement]] = None,
    ) -> Dict[str, Any]:
        """Build a sanitized scholarship context dictionary."""
        req_list: List[Dict[str, Any]] = []
        if requirements:
            for req in requirements:
                req_list.append({
                    "name": req.name,
                    "document_type": req.document_type,
                    "required": req.required,
                })

        return {
            "name": scholarship.name,
            "provider": scholarship.provider,
            "description": scholarship.description,
            "amount_inr": float(scholarship.amount) if scholarship.amount is not None else 0.0,
            "deadline": str(scholarship.deadline) if scholarship.deadline else "Not specified",
            "eligibility_text": scholarship.eligibility or "Open eligibility / unstated",
            "benefits": scholarship.benefits or [],
            "selection_process": scholarship.selection_process or [],
            "official_website": scholarship.official_website or "",
            "document_requirements": req_list,
        }

    @classmethod
    def build_system_instruction(cls) -> str:
        """System instructions enforcing structured analysis and JSON output."""
        return (
            "You are an expert scholarship advisor and eligibility evaluation system for ScholarHub. "
            "Your task is to analyze a student's profile (academic background, financial status, location, categories) "
            "and compare it against a scholarship's criteria, eligibility details, benefits, and requirements. "
            "Evaluate deterministic criteria (e.g. course, GPA, income limits, quota categories) and semantic alignment. "
            "You MUST respond ONLY with a valid JSON object adhering strictly to the schema specified in the user prompt. "
            "Do NOT include markdown fences (```json) in your final response if the API expects raw JSON, or ensure valid JSON syntax."
        )

    @classmethod
    def build_single_match_prompt(
        cls,
        student_data: Dict[str, Any],
        scholarship_data: Dict[str, Any],
    ) -> str:
        """Construct prompt for single scholarship match evaluation."""
        return f"""Evaluate the compatibility between the following Student and Scholarship:

=== STUDENT PROFILE ===
Personal:
- Name: {student_data.get('personal', {}).get('first_name', 'Student')}
- Gender: {student_data.get('personal', {}).get('gender', 'Not specified')}
- Location: {student_data.get('personal', {}).get('city', '')}, {student_data.get('personal', {}).get('state', '')}, {student_data.get('personal', {}).get('country', '')}

Academic:
- Course: {student_data.get('academic', {}).get('course', 'Not specified')}
- Branch: {student_data.get('academic', {}).get('branch', 'Not specified')}
- Current Year: {student_data.get('academic', {}).get('current_year', 'Not specified')}
- College / University: {student_data.get('academic', {}).get('college', 'Not specified')} / {student_data.get('academic', {}).get('university', 'Not specified')}
- CGPA: {student_data.get('academic', {}).get('cgpa', 'Not specified')}
- Previous Percentage: {student_data.get('academic', {}).get('previous_percentage', 'Not specified')}%

Financial & Preferences:
- Reservation Category: {student_data.get('financial', {}).get('reservation_category', 'Not specified')}
- Special Categories: {', '.join(student_data.get('financial', {}).get('special_categories', [])) or 'None'}
- Annual Family Income (INR): {student_data.get('financial', {}).get('family_income_inr', 'Not specified')}
- Study Preference: {student_data.get('financial', {}).get('study_preference', 'Not specified')}

=== SCHOLARSHIP DETAILS ===
- Title: {scholarship_data.get('name')}
- Provider: {scholarship_data.get('provider')}
- Description: {scholarship_data.get('description')}
- Award Amount (INR): {scholarship_data.get('amount_inr')}
- Deadline: {scholarship_data.get('deadline')}
- Stated Eligibility: {scholarship_data.get('eligibility_text')}
- Benefits: {', '.join(scholarship_data.get('benefits', [])) or 'None stated'}
- Selection Process: {', '.join(scholarship_data.get('selection_process', [])) or 'Standard application review'}
- Required Documents: {', '.join([r.get('name', '') for r in scholarship_data.get('document_requirements', [])]) or 'Standard documentation'}

=== INSTRUCTIONS ===
Calculate a match compatibility score between 0 and 100 based on:
1. Academic Alignment (course, GPA/marks, year of study)
2. Financial & Category Eligibility (income ceilings, reservation/special quotas)
3. Location & Study Preferences
4. Application Feasibility

Respond with a JSON object with EXACTLY the following structure:
{{
  "match_score": <integer from 0 to 100>,
  "match_level": "<one of: EXCELLENT_MATCH, GOOD_MATCH, MODERATE_MATCH, LOW_MATCH, NOT_ELIGIBLE, UNKNOWN>",
  "summary": "<2-3 sentence overview explaining the match assessment>",
  "matched_criteria": [
    "<specific confirmed or inferred criterion satisfied by student>"
  ],
  "potential_issues": [
    "<any missing prerequisites, GPA shortfalls, income threshold conflicts, or deadline risks>"
  ],
  "recommendations": [
    "<actionable recommendation for the student to maximize chances or complete missing details>"
  ]
}}
"""
