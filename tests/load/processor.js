/**
 * ═══════════════════════════════════════════════════════════════════
 * WOLF HMS — Artillery Processor (Variable Randomization Engine)
 * ═══════════════════════════════════════════════════════════════════
 * Artillery v2 does NOT support $randomChoice() in YAML templates.
 * This processor injects randomized clinical values into each VU
 * before the flow runs.
 * ═══════════════════════════════════════════════════════════════════
 */

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = {
    setICUVentilatorVars: function (userContext, events, done) {
        userContext.vars.ventilator_mode = pick(['VCV', 'PCV', 'SIMV', 'PSV', 'CPAP', 'BIPAP', 'APRV', 'HFOV']);
        userContext.vars.peep = rand(4, 24);
        userContext.vars.fio2 = rand(21, 100);
        userContext.vars.respiratory_rate = rand(8, 40);
        userContext.vars.tidal_volume = rand(200, 900);
        userContext.vars.peak_pressure = rand(12, 50);
        userContext.vars.plateau_pressure = rand(8, 38);
        userContext.vars.sp02 = rand(60, 100);
        userContext.vars.ie_ratio = pick(['1:1', '1:2', '1:3', '1:4', '2:1']);
        userContext.vars.admission_id = rand(1, 500);
        return done();
    },

    setICUFluidVars: function (userContext, events, done) {
        userContext.vars.admission_id = rand(1, 500);
        userContext.vars.iv_fluids_ml = rand(50, 500);
        userContext.vars.blood_products_ml = rand(0, 350);
        userContext.vars.oral_intake_ml = rand(0, 250);
        userContext.vars.enteral_feeding_ml = rand(0, 200);
        userContext.vars.urine_output_ml = rand(20, 400);
        userContext.vars.drain_output_ml = rand(0, 150);
        userContext.vars.stool_output_ml = rand(0, 100);
        userContext.vars.emesis_ml = rand(0, 75);
        return done();
    },

    setDentalVars: function (userContext, events, done) {
        userContext.vars.patient_id = rand(1, 500);
        userContext.vars.chief_complaint = pick([
            'Severe toothache upper right molar',
            'Sensitivity to cold and hot beverages',
            'Bleeding gums during brushing',
            'Impacted wisdom tooth pain',
            'Crown fracture after trauma',
            'Routine scaling and polishing'
        ]);
        userContext.vars.diagnosis = pick([
            'Dental Caries Class II MOD',
            'Chronic Periodontitis Stage III Grade B',
            'Impacted Lower Third Molar',
            'Acute Irreversible Pulpitis',
            'Generalized Gingivitis',
            'Periapical Abscess 46'
        ]);
        userContext.vars.treatment_plan = pick([
            'Root canal treatment followed by PFM crown',
            'Surgical extraction under LA with suturing',
            'Full mouth scaling and root planing in 4 quadrants',
            'Composite restoration Class II MOD with rubber dam isolation',
            'Incision and drainage followed by antibiotic therapy'
        ]);
        return done();
    }
};
