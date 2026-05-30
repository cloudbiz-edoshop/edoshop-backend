import fs from "node:fs";
// Latest version - v3.0.0 with Tree Shaking to reduce bundle size
import { City, Country } from "country-state-city";

const countries = Country.getAllCountries();

const cities = City.getAllCities();
fs.writeFileSync("countries.json", JSON.stringify(countries, null, 2));

fs.writeFileSync("cities.json", JSON.stringify(cities, null, 2));
