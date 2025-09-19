// Dashboard.jsx
import React, { useState, useEffect } from "react";
import { Bar } from "react-chartjs-2";
import supabase from "./config/supabaseclient";
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { FaRankingStar } from "react-icons/fa6";

// Components
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";


// Chart.js registration
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend
);

const ranking = [
  { rank: "1", name: "Juan Dela Cruz", sections: "Section A", grades: 45 },
  { rank: "2", name: "Maria Santos", sections: "Section A", grades: 38 },
  { rank: "3", name: "Pedro Reyes", sections: "Section A", grades: 50 },
  { rank: "4", name: "Ana Lopez", sections: "Section A", grades: 42 },
  { rank: "5", name: "Railey Alcaraz", sections: "Section A", grades: 42 },
  { rank: "6", name: "John Louie Dollente", sections: "Section A", grades: 43 },
  { rank: "7", name: "Carlo Mendoza", sections: "Section A", grades: 39 },
  { rank: "8", name: "Sophia Cruz", sections: "Section A", grades: 47 },
  { rank: "9", name: "Daniel Ramos", sections: "Section A", grades: 36 },
  { rank: "10", name: "Isabella Torres", sections: "Section A", grades: 44 },
  { rank: "11", name: "Miguel Fernandez", sections: "Section A", grades: 41 },
  { rank: "12", name: "Angela Bautista", sections: "Section A", grades: 40 },
  { rank: "13", name: "Christian Garcia", sections: "Section A", grades: 37 },
  { rank: "14", name: "Katrina Villanueva", sections: "Section A", grades: 46 },
  { rank: "15", name: "Mark Salazar", sections: "Section A", grades: 35 },
  { rank: "16", name: "Patricia Navarro", sections: "Section A", grades: 42 },
  { rank: "17", name: "Jason Aquino", sections: "Section A", grades: 48 },
  { rank: "18", name: "Christine Ramos", sections: "Section A", grades: 39 },
  { rank: "19", name: "Francis Domingo", sections: "Section A", grades: 37 },
  { rank: "20", name: "Nicole Herrera", sections: "Section A", grades: 44 },
  { rank: "21", name: "James Cortez", sections: "Section A", grades: 41 },
  { rank: "22", name: "Ella Gutierrez", sections: "Section A", grades: 36 },
  { rank: "23", name: "Adrian Castillo", sections: "Section A", grades: 45 },
  { rank: "24", name: "Bianca Morales", sections: "Section A", grades: 43 },
  { rank: "25", name: "Joshua Enriquez", sections: "Section A", grades: 38 },
  { rank: "26", name: "Rafael Santos", sections: "Section A", grades: 47 },
  { rank: "27", name: "Jasmine Lim", sections: "Section A", grades: 40 },
  { rank: "28", name: "Kyle Vergara", sections: "Section A", grades: 42 },
  { rank: "29", name: "Diana Cruz", sections: "Section A", grades: 39 },
  { rank: "30", name: "Victor Ramos", sections: "Section A", grades: 46 },
];



const dashboard = () => {
  // States
  const [visible, setVisible] = useState(false);
  const [user, setUser] = useState(null);
  const [profilePic, setProfilePic] = useState(null);

  // Load Supabase user + profile pic
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (!error && user) setUser(user);

      // Load profile pic from teachers table
      const { data: teacherData } = await supabase
        .from("teachers")
        .select("profile_pic")
        .eq("auth_id", user.id)
        .single();

      if (teacherData?.profile_pic) setProfilePic(teacherData.profile_pic);
    };
    fetchUser();
  }, []);

  if (!user) return <div>Loading...</div>;

  return (
    <div className="grid sm:grid-cols-1 sm:grid-rows-[100px_200px_1fr_1fr] lg:grid-cols-[1fr_1fr] lg:grid-rows-[60px_240px_1fr]">
      {/* Navbar with profile pic + logout */}
      <Navbar
        setVisible={setVisible}
        user={user}
        profilePic={profilePic}
        setProfilePic={setProfilePic}
      />

      {/* Sidebar */}
      <Sidebar visible={visible} setVisible={setVisible} />

      {/* Dashboard Content */}
      <div className="col-span-2 row-start-2 lg:flex lg:flex-col lg:items-center lg:h-full lg:justify-center shadow-md">
        <h1 className="text-3xl font-bold p-1">Teacher's Dashboard</h1>
        <h2 className="text-gray-600 m-1">Welcome, {user.email}</h2>
        <div className="flex flex-row items-center justify-start gap-10 p-1">
          {["Total Students", "Incomplete Students"].map(
            (title, i) => (
              <div
                key={i}
                className="h-36 w-80 shadow-2xl bg-gray-100 rounded-3xl flex flex-col items-center justify-center"
              >
                <h3 className="font-semibold text-lg">{title}</h3>
                <h5 className="text-4xl font-bold">0</h5>
              </div>
            )
          )}
        </div>
      </div>

      {/* Charts */}
      <div className="row-start-3 lg:h-full flex flex-col items-center border border-black ">
        <div className=" w-[600px] rounded-lg shadow-md border border-black m-5">
          <h1 className=" font-semibold p-5">Student Grades Gain</h1>
          <div className="w-full h-[435px] p-5  ">
            <Bar
              data={{
                labels: ["A", "B", "C"],
                datasets: [
                  {
                    label: "Section 1",
                    data: [12, 19, 3],
                    backgroundColor: ["#3b82f6", "#06b6d4", "#f59e0b"],
                  },
                ],
              }}
              options={{
                maintainAspectRatio: false,
                responsive: true,
                plugins: { legend: { position: "bottom" } },
              }}
              redraw
            />
          </div>
        </div>
        
      </div>
      {/* Studen ranking table */}
      <div className="row-start-3 lg:h-full flex flex-col items-center shadow-md border border-black">
        <div className="bg-[#f1f1f1] w-[650px] m-5 h-[500px] p-5 shadow-xl rounded-lg border border-black">
            <div className="border border-gray-300 flex justify-between rounded-md ">
            <div className="flex flex justify-between">
              <h1 className="text-lg font-semibold p-2">Students Ranking</h1>
              <FaRankingStar className="text-black text-3xl" />
            </div>
              
              <select name="cars" id="cars" className="bg-yellow2 m-2 border border-gray-100 rounded-md p-1">
                <option value="" disabled selected hidden >Select Section</option>
                <option value="volvo">Volvo</option>
                <option value="saab">Saab</option>
                <option value="mercedes">Mercedes</option>
                <option value="audi">Audi</option>
              </select>
            </div>
              {/* scroll container */}
              <div className="overflow-x-auto overflow-y-auto max-h-[350px] custom-scrollbar">
                <DataTable
                  value={ranking}
                  rowClassName="border shadow-sm text-center"
                  tableClassName="min-w-full border-collapse border shadow-xl"
                  
                >
                  <Column
                    field="rank"
                    header="Top"
                    style={{ width: "50px", textAlign: "center" }}
                    headerClassName="bg-Blue2 text-white border border-black pl-12"
                  />
                  <Column
                    field="name"
                    header="Name"
                    style={{ width: "140px", textAlign: "center" }}
                    headerClassName="bg-Blue2 text-white border border-black pl-28"
                  />
                  {/* <Column
                    field="sections"
                    header="Sections"
                    style={{ width: "80px", textAlign: "center" }}
                    headerClassName="bg-Blue2 text-white border border-black pl-10"
                  /> */}
                  <Column
                    field="grades"
                    header="Grades"
                    sortable
                    style={{ width: "80px", textAlign: "center" }}
                    headerClassName="bg-Blue2 text-white border border-black pl-12 "
                  />
                </DataTable>
              </div>
          </div> 
      </div>
    </div>
  );
};

export default dashboard;
