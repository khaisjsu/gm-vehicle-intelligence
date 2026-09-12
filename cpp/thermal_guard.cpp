#include <cstdlib>
#include <iomanip>
#include <iostream>
#include <string>

// Native safety boundary: intentionally small, deterministic, and independently testable.
int main(int argc, char** argv) {
  if (argc != 2) return 2;
  const double temperature = std::atof(argv[1]);
  std::string state = "NOMINAL";
  std::string action = "Continue operation and monitor telemetry.";
  int severity = 0;
  if (temperature > 55.0) { state = "CRITICAL"; action = "Controlled shutdown required immediately."; severity = 2; }
  else if (temperature > 45.0) { state = "WARNING"; action = "Reduce charge current and schedule inspection."; severity = 1; }
  std::cout << "{\"temperature_c\":" << std::fixed << std::setprecision(1) << temperature
            << ",\"state\":\"" << state << "\",\"severity\":" << severity
            << ",\"action\":\"" << action << "\",\"engine\":\"cpp-thermal-guard\"}";
  return 0;
}
