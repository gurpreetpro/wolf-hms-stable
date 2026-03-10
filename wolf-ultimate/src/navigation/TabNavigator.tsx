import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { StyleSheet } from 'react-native';
import { Activity, Users, FileText, Calendar, Zap, LayoutDashboard, BedDouble, ListTodo, Wrench, ClipboardList, Stethoscope, MessageSquare, FlaskConical, TestTubes, AlertTriangle, BarChart3, Pill, Package, UserPlus, ListOrdered, Search, Scan, Radio, Dumbbell, UtensilsCrossed, Droplet, Heart } from 'lucide-react-native';
import { DoctorStackNavigator } from './DoctorStackNavigator';
import { NurseStackNavigator } from './NurseStackNavigator';
import { WardStackNavigator } from './WardStackNavigator';
import { RmoStackNavigator } from './RmoStackNavigator';
import { LabStackNavigator } from './LabStackNavigator';
import { PharmacistStackNavigator } from './PharmacistStackNavigator';
import { ReceptionStackNavigator } from './ReceptionStackNavigator';
import { RadiologyStackNavigator } from './RadiologyStackNavigator';
import { PhysioStackNavigator } from './PhysioStackNavigator';
import { DietStackNavigator } from './DietStackNavigator';
import { BiomedStackNavigator } from './BiomedStackNavigator';
import { CSSDStackNavigator } from './CSSDStackNavigator';
import { BloodBankStackNavigator } from './BloodBankStackNavigator';
import { HIMStackNavigator } from './HIMStackNavigator';

// Doctor Tab Screens
import { PatientHubScreen } from '../screens/doctor/PatientHubScreen';
import { ClinicalHubScreen } from '../screens/doctor/ClinicalHubScreen';
import { AppointmentsScreen } from '../screens/doctor/AppointmentsScreen';
import { DoctorMoreScreen } from '../screens/doctor/DoctorMoreScreen';

// Nurse Tab Screens
import { NurseWardScreen } from '../screens/nurse/NurseWardScreen';
import { NurseTaskHubScreen } from '../screens/nurse/NurseTaskHubScreen';
import { NurseToolsScreen } from '../screens/nurse/NurseToolsScreen';
import { NurseMoreScreen } from '../screens/nurse/NurseMoreScreen';

// Ward Tab Screens
import { AdmissionScreen } from '../screens/ward/AdmissionScreen';
import { StaffRosterScreen } from '../screens/ward/StaffRosterScreen';
import { WardOpsScreen } from '../screens/ward/WardOpsScreen';
import { WardMoreScreen } from '../screens/ward/WardMoreScreen';

// RMO Tab Screens
import { DutyRosterScreen } from '../screens/rmo/DutyRosterScreen';
import { ConsultantStatusScreen } from '../screens/rmo/ConsultantStatusScreen';

// Lab Tab Screens
import { SampleWorklistScreen } from '../screens/lab/SampleWorklistScreen';
import { LabMoreScreen } from '../screens/lab/LabMoreScreen';
import { RmoMoreScreen } from '../screens/rmo/RmoMoreScreen';

// Pharmacist Tab Screens
import { PrescriptionQueueScreen } from '../screens/pharmacist/PrescriptionQueueScreen';
import { PharmacistMoreScreen } from '../screens/pharmacist/PharmacistMoreScreen';

// Reception Tab Screens
import { TokenQueueScreen as ReceptionTokenQueue } from '../screens/reception/TokenQueueScreen';
import { ReceptionMoreScreen } from '../screens/reception/ReceptionMoreScreen';

// Radiology Tab Screens
import { RadiologyMoreScreen } from '../screens/radiology/RadiologyMoreScreen';

// Physio Tab Screens
import { PhysioMoreScreen } from '../screens/physio/PhysioMoreScreen';

// Diet Tab Screens
import { DietMoreScreen } from '../screens/diet/DietMoreScreen';

// Biomed Tab Screens
import { BiomedMoreScreen } from '../screens/biomed/BiomedMoreScreen';

// CSSD Tab Screens
import { CSSDMoreScreen } from '../screens/cssd/CSSDMoreScreen';

// Blood Bank Tab Screens
import { BloodBankMoreScreen } from '../screens/bloodbank/BloodBankMoreScreen';

// HIM Tab Screens
import { HIMMoreScreen } from '../screens/him/HIMMoreScreen';

import { useAuthStore } from '../store/authStore';
import { COLORS, SPACING } from '../theme/theme';

const Tab = createBottomTabNavigator();

export const TabNavigator = () => {
    const user = useAuthStore(state => state.user);

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    position: 'absolute',
                    bottom: 16,
                    left: 16, 
                    right: 16,
                    maxWidth: 500,
                    alignSelf: 'center',
                    marginHorizontal: 'auto',
                    elevation: 0,
                    backgroundColor: 'transparent',
                    borderTopWidth: 0,
                    height: 65,
                    borderRadius: 20,
                    overflow: 'hidden',
                },
                tabBarBackground: () => (
                    <BlurView 
                        tint="dark" 
                        intensity={50} 
                        style={[StyleSheet.absoluteFill, { borderRadius: 20, overflow: 'hidden' }]}
                    /> 
                ),
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: COLORS.textSecondary,
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontFamily: 'Inter_500Medium',
                    marginBottom: 6,
                },
                tabBarIconStyle: {
                    marginTop: 6,
                },
                tabBarItemStyle: {
                    borderRadius: 16,
                    margin: 4,
                },
            }}
            id="MainTab"
        >
            {/* ═══════════════════════════════════════════ */}
            {/* DOCTOR WORKSPACE — 5 Tabs                  */}
            {/* ═══════════════════════════════════════════ */}
            {user?.role === 'doctor' && (
                <>
                    <Tab.Screen 
                        name="DoctorHome" 
                        component={DoctorStackNavigator} 
                        options={{
                            tabBarLabel: 'Home',
                            tabBarIcon: ({color}) => <Activity color={color} size={22} />,
                        }}
                    />
                    <Tab.Screen 
                        name="Patients" 
                        component={PatientHubScreen}
                        options={{
                            tabBarLabel: 'Patients',
                            tabBarIcon: ({color}) => <Users color={color} size={22} />,
                        }}
                    />
                    <Tab.Screen 
                        name="Clinical" 
                        component={ClinicalHubScreen}
                        options={{
                            tabBarLabel: 'Clinical',
                            tabBarIcon: ({color}) => <FileText color={color} size={22} />,
                        }}
                    />
                    <Tab.Screen 
                        name="Schedule" 
                        component={AppointmentsScreen}
                        options={{
                            tabBarLabel: 'Schedule',
                            tabBarIcon: ({color}) => <Calendar color={color} size={22} />,
                        }}
                    />
                    <Tab.Screen 
                        name="DoctorMore" 
                        component={DoctorMoreScreen}
                        options={{
                            tabBarLabel: 'More',
                            tabBarIcon: ({color}) => <Zap color={color} size={22} />,
                        }}
                    />
                </>
            )}

            {/* ═══════════════════════════════════════════ */}
            {/* NURSE WORKSPACE — 5 Tabs                   */}
            {/* ═══════════════════════════════════════════ */}
            {(user?.role === 'nurse' || user?.role === 'ward_incharge') && (
                <>
                    <Tab.Screen 
                        name="NurseHome" 
                        component={NurseStackNavigator} 
                        options={{
                            tabBarLabel: 'Home',
                            tabBarIcon: ({color}) => <LayoutDashboard color={color} size={22} />,
                        }}
                    />
                    <Tab.Screen 
                        name="Ward" 
                        component={NurseWardScreen}
                        options={{
                            tabBarLabel: 'Ward',
                            tabBarIcon: ({color}) => <BedDouble color={color} size={22} />,
                        }}
                    />
                    <Tab.Screen 
                        name="Tasks" 
                        component={NurseTaskHubScreen}
                        options={{
                            tabBarLabel: 'Tasks',
                            tabBarIcon: ({color}) => <ListTodo color={color} size={22} />,
                        }}
                    />
                    <Tab.Screen 
                        name="Tools" 
                        component={NurseToolsScreen}
                        options={{
                            tabBarLabel: 'Tools',
                            tabBarIcon: ({color}) => <Wrench color={color} size={22} />,
                        }}
                    />
                    <Tab.Screen 
                        name="NurseMore" 
                        component={NurseMoreScreen}
                        options={{
                            tabBarLabel: 'More',
                            tabBarIcon: ({color}) => <Zap color={color} size={22} />,
                        }}
                    />
                </>
            )}

            {/* ═══════════════════════════════════════════ */}
            {/* WARD INCHARGE WORKSPACE — 5 Tabs           */}
            {/* ═══════════════════════════════════════════ */}
            {user?.role === 'ward_incharge' && (
                <>
                    <Tab.Screen 
                        name="WardHome" 
                        component={WardStackNavigator} 
                        options={{
                            tabBarLabel: 'Home',
                            tabBarIcon: ({color}) => <LayoutDashboard color={color} size={22} />,
                        }}
                    />
                    <Tab.Screen 
                        name="Beds" 
                        component={AdmissionScreen}
                        options={{
                            tabBarLabel: 'Beds',
                            tabBarIcon: ({color}) => <BedDouble color={color} size={22} />,
                        }}
                    />
                    <Tab.Screen 
                        name="Staff" 
                        component={StaffRosterScreen}
                        options={{
                            tabBarLabel: 'Staff',
                            tabBarIcon: ({color}) => <Users color={color} size={22} />,
                        }}
                    />
                    <Tab.Screen 
                        name="Operations" 
                        component={WardOpsScreen}
                        options={{
                            tabBarLabel: 'Ops',
                            tabBarIcon: ({color}) => <Wrench color={color} size={22} />,
                        }}
                    />
                    <Tab.Screen 
                        name="WardMore" 
                        component={WardMoreScreen}
                        options={{
                            tabBarLabel: 'More',
                            tabBarIcon: ({color}) => <Zap color={color} size={22} />,
                        }}
                    />
                </>
            )}

            {/* ═══════════════════════════════════════════ */}
            {/* RMO WORKSPACE — 5 Tabs                     */}
            {/* ═══════════════════════════════════════════ */}
            {user?.role === 'rmo' && (
                <>
                    <Tab.Screen 
                        name="RmoHome" 
                        component={RmoStackNavigator} 
                        options={{
                            tabBarLabel: 'Home',
                            tabBarIcon: ({color}) => <Stethoscope color={color} size={22} />,
                        }}
                    />
                    <Tab.Screen 
                        name="RmoDutyRoster" 
                        component={DutyRosterScreen}
                        options={{
                            tabBarLabel: 'Roster',
                            tabBarIcon: ({color}) => <Calendar color={color} size={22} />,
                        }}
                    />
                    <Tab.Screen 
                        name="RmoConsultants" 
                        component={ConsultantStatusScreen}
                        options={{
                            tabBarLabel: 'Consult',
                            tabBarIcon: ({color}) => <Users color={color} size={22} />,
                        }}
                    />
                    <Tab.Screen 
                        name="RmoChat" 
                        component={RmoMoreScreen}
                        options={{
                            tabBarLabel: 'Chat',
                            tabBarIcon: ({color}) => <MessageSquare color={color} size={22} />,
                        }}
                    />
                    <Tab.Screen 
                        name="RmoMore" 
                        component={RmoMoreScreen}
                        options={{
                            tabBarLabel: 'More',
                            tabBarIcon: ({color}) => <Zap color={color} size={22} />,
                        }}
                    />
                </>
            )}

            {/* ═══════════════════════════════════════════ */}
            {/* PHARMACIST WORKSPACE — 5 Tabs              */}
            {/* ═══════════════════════════════════════════ */}
            {user?.role === 'pharmacist' && (
                <>
                    <Tab.Screen 
                        name="PharmHome" 
                        component={PharmacistStackNavigator} 
                        options={{
                            tabBarLabel: 'Home',
                            tabBarIcon: ({color}) => <Pill color={color} size={22} />,
                        }}
                    />
                    <Tab.Screen 
                        name="PharmQueue" 
                        component={PrescriptionQueueScreen}
                        options={{
                            tabBarLabel: 'Rx Queue',
                            tabBarIcon: ({color}) => <ClipboardList color={color} size={22} />,
                        }}
                    />
                    <Tab.Screen 
                        name="PharmAlerts" 
                        component={PharmacistMoreScreen}
                        options={{
                            tabBarLabel: 'Alerts',
                            tabBarIcon: ({color}) => <AlertTriangle color={color} size={22} />,
                        }}
                    />
                    <Tab.Screen 
                        name="PharmInventory" 
                        component={PharmacistMoreScreen}
                        options={{
                            tabBarLabel: 'Stock',
                            tabBarIcon: ({color}) => <Package color={color} size={22} />,
                        }}
                    />
                    <Tab.Screen 
                        name="PharmMore" 
                        component={PharmacistMoreScreen}
                        options={{
                            tabBarLabel: 'More',
                            tabBarIcon: ({color}) => <Zap color={color} size={22} />,
                        }}
                    />
                </>
            )}

            {/* ═══════════════════════════════════════════ */}
            {/* LAB TECHNICIAN WORKSPACE — 5 Tabs           */}
            {/* ═══════════════════════════════════════════ */}
            {user?.role === 'lab_tech' && (
                <>
                    <Tab.Screen 
                        name="LabHome" 
                        component={LabStackNavigator} 
                        options={{
                            tabBarLabel: 'Home',
                            tabBarIcon: ({color}) => <FlaskConical color={color} size={22} />,
                        }}
                    />
                    <Tab.Screen 
                        name="LabWorklist" 
                        component={SampleWorklistScreen}
                        options={{
                            tabBarLabel: 'Worklist',
                            tabBarIcon: ({color}) => <TestTubes color={color} size={22} />,
                        }}
                    />
                    <Tab.Screen 
                        name="LabAlerts" 
                        component={LabMoreScreen}
                        options={{
                            tabBarLabel: 'Alerts',
                            tabBarIcon: ({color}) => <AlertTriangle color={color} size={22} />,
                        }}
                    />
                    <Tab.Screen 
                        name="LabQC" 
                        component={LabMoreScreen}
                        options={{
                            tabBarLabel: 'QC',
                            tabBarIcon: ({color}) => <BarChart3 color={color} size={22} />,
                        }}
                    />
                    <Tab.Screen 
                        name="LabMore" 
                        component={LabMoreScreen}
                        options={{
                            tabBarLabel: 'More',
                            tabBarIcon: ({color}) => <Zap color={color} size={22} />,
                        }}
                    />
                </>
            )}

            {/* ═══════════════════════════════════════════ */}
            {/* RECEPTIONIST WORKSPACE — 5 Tabs            */}
            {/* ═══════════════════════════════════════════ */}
            {user?.role === 'receptionist' && (
                <>
                    <Tab.Screen 
                        name="RecepHome" 
                        component={ReceptionStackNavigator} 
                        options={{
                            tabBarLabel: 'Home',
                            tabBarIcon: ({color}) => <LayoutDashboard color={color} size={22} />,
                        }}
                    />
                    <Tab.Screen 
                        name="RecepQueue" 
                        component={ReceptionTokenQueue}
                        options={{
                            tabBarLabel: 'Queue',
                            tabBarIcon: ({color}) => <Users color={color} size={22} />,
                        }}
                    />
                    <Tab.Screen 
                        name="RecepRegister" 
                        component={ReceptionMoreScreen}
                        options={{
                            tabBarLabel: 'Register',
                            tabBarIcon: ({color}) => <UserPlus color={color} size={22} />,
                        }}
                    />
                    <Tab.Screen 
                        name="RecepSearch" 
                        component={ReceptionMoreScreen}
                        options={{
                            tabBarLabel: 'Search',
                            tabBarIcon: ({color}) => <Search color={color} size={22} />,
                        }}
                    />
                    <Tab.Screen 
                        name="RecepMore" 
                        component={ReceptionMoreScreen}
                        options={{
                            tabBarLabel: 'More',
                            tabBarIcon: ({color}) => <Zap color={color} size={22} />,
                        }}
                    />
                </>
            )}

            {/* ═══════════════════════════════════════════ */}
            {/* RADIOLOGIST WORKSPACE — 5 Tabs             */}
            {/* ═══════════════════════════════════════════ */}
            {user?.role === 'radiologist' && (
                <>
                    <Tab.Screen 
                        name="RadHome" 
                        component={RadiologyStackNavigator} 
                        options={{
                            tabBarLabel: 'Home',
                            tabBarIcon: ({color}) => <LayoutDashboard color={color} size={22} />,
                        }}
                    />
                    <Tab.Screen 
                        name="RadWorklist" 
                        component={RadiologyMoreScreen}
                        options={{
                            tabBarLabel: 'Worklist',
                            tabBarIcon: ({color}) => <Scan color={color} size={22} />,
                        }}
                    />
                    <Tab.Screen 
                        name="RadReports" 
                        component={RadiologyMoreScreen}
                        options={{
                            tabBarLabel: 'Reports',
                            tabBarIcon: ({color}) => <FileText color={color} size={22} />,
                        }}
                    />
                    <Tab.Screen 
                        name="RadAlerts" 
                        component={RadiologyMoreScreen}
                        options={{
                            tabBarLabel: 'Alerts',
                            tabBarIcon: ({color}) => <AlertTriangle color={color} size={22} />,
                        }}
                    />
                    <Tab.Screen 
                        name="RadMore" 
                        component={RadiologyMoreScreen}
                        options={{
                            tabBarLabel: 'More',
                            tabBarIcon: ({color}) => <Zap color={color} size={22} />,
                        }}
                    />
                </>
            )}

            {/* ═══════════════════════════════════════════ */}
            {/* PHYSIOTHERAPIST WORKSPACE — 5 Tabs          */}
            {/* ═══════════════════════════════════════════ */}
            {user?.role === 'physiotherapist' && (
                <>
                    <Tab.Screen 
                        name="PhysHome" 
                        component={PhysioStackNavigator} 
                        options={{
                            tabBarLabel: 'Home',
                            tabBarIcon: ({color}) => <LayoutDashboard color={color} size={22} />,
                        }}
                    />
                    <Tab.Screen 
                        name="PhysExercise" 
                        component={PhysioMoreScreen}
                        options={{
                            tabBarLabel: 'Exercise',
                            tabBarIcon: ({color}) => <Dumbbell color={color} size={22} />,
                        }}
                    />
                    <Tab.Screen 
                        name="PhysSessions" 
                        component={PhysioMoreScreen}
                        options={{
                            tabBarLabel: 'Sessions',
                            tabBarIcon: ({color}) => <Calendar color={color} size={22} />,
                        }}
                    />
                    <Tab.Screen 
                        name="PhysAssess" 
                        component={PhysioMoreScreen}
                        options={{
                            tabBarLabel: 'Assess',
                            tabBarIcon: ({color}) => <ClipboardList color={color} size={22} />,
                        }}
                    />
                    <Tab.Screen 
                        name="PhysMore" 
                        component={PhysioMoreScreen}
                        options={{
                            tabBarLabel: 'More',
                            tabBarIcon: ({color}) => <Zap color={color} size={22} />,
                        }}
                    />
                </>
            )}

            {/* ═══════════════════════════════════════════ */}
            {/* DIETITIAN WORKSPACE — 5 Tabs                */}
            {/* ═══════════════════════════════════════════ */}
            {user?.role === 'dietitian' && (
                <>
                    <Tab.Screen 
                        name="DietHome" 
                        component={DietStackNavigator} 
                        options={{
                            tabBarLabel: 'Home',
                            tabBarIcon: ({color}) => <LayoutDashboard color={color} size={22} />,
                        }}
                    />
                    <Tab.Screen 
                        name="DietMeals" 
                        component={DietMoreScreen}
                        options={{
                            tabBarLabel: 'Meals',
                            tabBarIcon: ({color}) => <UtensilsCrossed color={color} size={22} />,
                        }}
                    />
                    <Tab.Screen 
                        name="DietKitchen" 
                        component={DietMoreScreen}
                        options={{
                            tabBarLabel: 'Kitchen',
                            tabBarIcon: ({color}) => <ClipboardList color={color} size={22} />,
                        }}
                    />
                    <Tab.Screen 
                        name="DietAlerts" 
                        component={DietMoreScreen}
                        options={{
                            tabBarLabel: 'Alerts',
                            tabBarIcon: ({color}) => <AlertTriangle color={color} size={22} />,
                        }}
                    />
                    <Tab.Screen 
                        name="DietMore" 
                        component={DietMoreScreen}
                        options={{
                            tabBarLabel: 'More',
                            tabBarIcon: ({color}) => <Zap color={color} size={22} />,
                        }}
                    />
                </>
            )}

            {/* ═══════════════════════════════════════════ */}
            {/* BIOMED ENGINEER WORKSPACE — 5 Tabs           */}
            {/* ═══════════════════════════════════════════ */}
            {user?.role === 'biomed_engineer' && (
                <>
                    <Tab.Screen 
                        name="BiomedHome" 
                        component={BiomedStackNavigator} 
                        options={{
                            tabBarLabel: 'Home',
                            tabBarIcon: ({color}) => <LayoutDashboard color={color} size={22} />,
                        }}
                    />
                    <Tab.Screen 
                        name="BiomedTickets" 
                        component={BiomedMoreScreen}
                        options={{
                            tabBarLabel: 'Tickets',
                            tabBarIcon: ({color}) => <AlertTriangle color={color} size={22} />,
                        }}
                    />
                    <Tab.Screen 
                        name="BiomedPM" 
                        component={BiomedMoreScreen}
                        options={{
                            tabBarLabel: 'PM',
                            tabBarIcon: ({color}) => <Calendar color={color} size={22} />,
                        }}
                    />
                    <Tab.Screen 
                        name="BiomedAMC" 
                        component={BiomedMoreScreen}
                        options={{
                            tabBarLabel: 'AMC',
                            tabBarIcon: ({color}) => <Wrench color={color} size={22} />,
                        }}
                    />
                    <Tab.Screen 
                        name="BiomedMore" 
                        component={BiomedMoreScreen}
                        options={{
                            tabBarLabel: 'More',
                            tabBarIcon: ({color}) => <Zap color={color} size={22} />,
                        }}
                    />
                </>
            )}

            {/* ═══════════════════════════════════════════ */}
            {/* CSSD TECH WORKSPACE — 5 Tabs                 */}
            {/* ═══════════════════════════════════════════ */}
            {user?.role === 'cssd_tech' && (
                <>
                    <Tab.Screen 
                        name="CSSDHome" 
                        component={CSSDStackNavigator} 
                        options={{
                            tabBarLabel: 'Home',
                            tabBarIcon: ({color}) => <LayoutDashboard color={color} size={22} />,
                        }}
                    />
                    <Tab.Screen 
                        name="CSSDCycles" 
                        component={CSSDMoreScreen}
                        options={{
                            tabBarLabel: 'Cycles',
                            tabBarIcon: ({color}) => <Activity color={color} size={22} />,
                        }}
                    />
                    <Tab.Screen 
                        name="CSSDInstruments" 
                        component={CSSDMoreScreen}
                        options={{
                            tabBarLabel: 'Trays',
                            tabBarIcon: ({color}) => <Package color={color} size={22} />,
                        }}
                    />
                    <Tab.Screen 
                        name="CSSDAlerts" 
                        component={CSSDMoreScreen}
                        options={{
                            tabBarLabel: 'BI Tests',
                            tabBarIcon: ({color}) => <AlertTriangle color={color} size={22} />,
                        }}
                    />
                    <Tab.Screen 
                        name="CSSDMore" 
                        component={CSSDMoreScreen}
                        options={{
                            tabBarLabel: 'More',
                            tabBarIcon: ({color}) => <Zap color={color} size={22} />,
                        }}
                    />
                </>
            )}

            {/* ═══════════════════════════════════════════ */}
            {/* BLOOD BANK TECH WORKSPACE — 5 Tabs            */}
            {/* ═══════════════════════════════════════════ */}
            {user?.role === 'blood_bank_tech' && (
                <>
                    <Tab.Screen 
                        name="BloodBankHome" 
                        component={BloodBankStackNavigator} 
                        options={{
                            tabBarLabel: 'Home',
                            tabBarIcon: ({color}) => <LayoutDashboard color={color} size={22} />,
                        }}
                    />
                    <Tab.Screen 
                        name="BloodBankCrossMatch" 
                        component={BloodBankMoreScreen}
                        options={{
                            tabBarLabel: 'X-Match',
                            tabBarIcon: ({color}) => <Droplet color={color} size={22} />,
                        }}
                    />
                    <Tab.Screen 
                        name="BloodBankDonations" 
                        component={BloodBankMoreScreen}
                        options={{
                            tabBarLabel: 'Donate',
                            tabBarIcon: ({color}) => <Heart color={color} size={22} />,
                        }}
                    />
                    <Tab.Screen 
                        name="BloodBankAlerts" 
                        component={BloodBankMoreScreen}
                        options={{
                            tabBarLabel: 'Alerts',
                            tabBarIcon: ({color}) => <AlertTriangle color={color} size={22} />,
                        }}
                    />
                    <Tab.Screen 
                        name="BloodBankMore" 
                        component={BloodBankMoreScreen}
                        options={{
                            tabBarLabel: 'More',
                            tabBarIcon: ({color}) => <Zap color={color} size={22} />,
                        }}
                    />
                </>
            )}

            {/* ═══════════════════════════════════════════ */}
            {/* MEDICAL RECORDS (HIM) WORKSPACE — 5 Tabs      */}
            {/* ═══════════════════════════════════════════ */}
            {user?.role === 'medical_records' && (
                <>
                    <Tab.Screen 
                        name="HIMHome" 
                        component={HIMStackNavigator} 
                        options={{
                            tabBarLabel: 'Home',
                            tabBarIcon: ({color}) => <LayoutDashboard color={color} size={22} />,
                        }}
                    />
                    <Tab.Screen 
                        name="HIMRequests" 
                        component={HIMMoreScreen}
                        options={{
                            tabBarLabel: 'Requests',
                            tabBarIcon: ({color}) => <FileText color={color} size={22} />,
                        }}
                    />
                    <Tab.Screen 
                        name="HIMCoding" 
                        component={HIMMoreScreen}
                        options={{
                            tabBarLabel: 'ICD',
                            tabBarIcon: ({color}) => <ClipboardList color={color} size={22} />,
                        }}
                    />
                    <Tab.Screen 
                        name="HIMAudit" 
                        component={HIMMoreScreen}
                        options={{
                            tabBarLabel: 'Audit',
                            tabBarIcon: ({color}) => <BarChart3 color={color} size={22} />,
                        }}
                    />
                    <Tab.Screen 
                        name="HIMMore" 
                        component={HIMMoreScreen}
                        options={{
                            tabBarLabel: 'More',
                            tabBarIcon: ({color}) => <Zap color={color} size={22} />,
                        }}
                    />
                </>
            )}
        </Tab.Navigator>
    );
};
