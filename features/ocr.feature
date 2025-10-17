Feature: OCR
Scenario: Check if text is INCLUDED in the opengraph image
    When I open localhost:3000/image-with-text.png
    # Andrea's profile
    Then the image contains "Hello World"
