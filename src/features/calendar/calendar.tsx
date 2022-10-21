import React, { Fragment, useEffect, useState } from "react";

import { useMutation, useQuery } from "@tanstack/react-query";

import { Meeting } from "../../types";

import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  createEvent,
  deleteEvent,
  editEvent,
  loadEvents,
} from "../../store/events";

import { Menu, Transition } from "@headlessui/react";
import { DotsVerticalIcon } from "@heroicons/react/outline";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/solid";

import {
  add,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isEqual,
  isSameDay,
  isSameMonth,
  isToday,
  isValid,
  parse,
  parseISO,
  startOfToday,
} from "date-fns";

interface Error {
  name: boolean;
  start: boolean;
  end: boolean;
}

function classNames(...classes: (string | boolean)[]) {
  return classes.filter(Boolean).join(" ");
}

const DATE_TIME_FORMAT = "dd/MM/yyyy HH:mm";

const MONTH_YEAR_FORMAT = "MMM-yyyy";

export default function Calendar() {
  const dispatch = useAppDispatch();
  const meetings = useAppSelector((state) => state.events);

  const today = startOfToday();
  const [selectedDay, setSelectedDay] = useState(today);
  const [currentMonth, setCurrentMonth] = useState(
    format(today, MONTH_YEAR_FORMAT)
  );
  const [editing, setEditing] = useState(false);
  const [addingNewMeeting, setAddingNewMeeting] = useState(false);
  const [errors, setErrors] = useState<Error>({
    name: false,
    start: false,
    end: false,
  });
  const [loading, setLoading] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | undefined>();
  const [newMeeting, setNewMeeting] = useState<Meeting>({
    id: meetings.length,
    name: "",
    startDatetime: format(selectedDay, DATE_TIME_FORMAT),
    editStartDate: format(selectedDay, DATE_TIME_FORMAT),
    endDatetime: format(selectedDay, DATE_TIME_FORMAT),
    editEndDate: format(selectedDay, DATE_TIME_FORMAT),
  });
  const firstDayCurrentMonth = parse(
    currentMonth,
    MONTH_YEAR_FORMAT,
    new Date()
  );

  const newMeetingModel = {
    id: meetings.length,
    name: "",
    startDatetime: format(selectedDay, DATE_TIME_FORMAT),
    editStartDate: format(selectedDay, DATE_TIME_FORMAT),
    endDatetime: format(selectedDay, DATE_TIME_FORMAT),
    editEndDate: format(selectedDay, DATE_TIME_FORMAT),
  };

  useEffect(() => {
    setNewMeeting((previousMeeting) => ({
      ...previousMeeting,
      startDatetime: format(selectedDay, DATE_TIME_FORMAT),
      editStartDate: format(selectedDay, DATE_TIME_FORMAT),
      endDatetime: format(selectedDay, DATE_TIME_FORMAT),
      editEndDate: format(selectedDay, DATE_TIME_FORMAT),
    }));
  }, [selectedDay]);

  const { isLoading, error } = useQuery(["meetings"], () =>
    fetch("http://localhost:8888/calendar")
      .then((res) => res.json())
      .then((data) => {
        dispatch(loadEvents(data.data));
        return data;
      })
  );

  async function createMeeting(meeting: Meeting) {
    fetch("http://localhost:8888/calendar", {
      method: "post",
      body: JSON.stringify({ data: [...meetings, meeting] }),
      headers: { "Content-Type": "application/json" },
    });
  }

  const createMutation = useMutation(createMeeting);

  async function deleteMeeting(meeting: Meeting) {
    fetch(`http://localhost:8888/calendar`, {
      method: "post",
      body: JSON.stringify({
        data: meetings.filter((item) => item.id !== meeting.id),
      }),
      headers: { "Content-Type": "application/json" },
    });
  }

  const deleteMutation = useMutation(deleteMeeting);

  async function editMeetingMutation(meeting: Meeting) {
    fetch(`http://localhost:8888/calendar`, {
      method: "post",
      body: JSON.stringify({
        data: meetings.map((item) => {
          if (item.id === meeting.id) {
            return meeting;
          }
          return item;
        }),
      }),
      headers: { "Content-Type": "application/json" },
    });
  }

  const editMutation = useMutation(editMeetingMutation);

  const days = eachDayOfInterval({
    start: firstDayCurrentMonth,
    end: endOfMonth(firstDayCurrentMonth),
  });

  function previousMonth() {
    const firstDayNextMonth = add(firstDayCurrentMonth, { months: -1 });
    setCurrentMonth(format(firstDayNextMonth, MONTH_YEAR_FORMAT));
  }

  function nextMonth() {
    const firstDayNextMonth = add(firstDayCurrentMonth, { months: 1 });
    setCurrentMonth(format(firstDayNextMonth, MONTH_YEAR_FORMAT));
  }

  const selectedDayMeetings = meetings?.filter((meeting) =>
    isSameDay(parseISO(meeting.startDatetime), selectedDay)
  );

  function cancelMeeting(currentMeeting: Meeting) {
    dispatch(deleteEvent(currentMeeting.id));
    deleteMutation.mutate(currentMeeting);
  }

  function onInputChange(value: string, item: string) {
    if (value.length >= 30 && item === "name") {
      return;
    }
    if (selectedMeeting) {
      setSelectedMeeting({ ...selectedMeeting, [item]: value });
    }
  }

  function onInputHandle(value: string, item: string) {
    if (value.length >= 30 && item === "name") {
      return;
    }
    setNewMeeting({ ...newMeeting, [item]: value });
  }

  function editMeeting() {
    setLoading(true);
    if (selectedMeeting) {
      try {
        const startDate = parse(
          selectedMeeting.editStartDate,
          "dd/MM/yyyy HH:mm",
          new Date()
        );

        const endDate = parse(
          selectedMeeting.editEndDate,
          "dd/MM/yyyy HH:mm",
          new Date()
        );

        const startDateValid = isValid(startDate);
        const endDateValid = isValid(endDate);

        if (!startDateValid || !endDateValid || !selectedMeeting.name.length) {
          !selectedMeeting.name.length && setErrors({ ...errors, name: true });
          !startDateValid && setErrors({ ...errors, start: true });
          !endDateValid && setErrors({ ...errors, end: true });
        } else {
          const meetingObject = {
            ...selectedMeeting,
            startDatetime: startDate.toISOString(),
            endDatetime: endDate.toISOString(),
          };
          setErrors({ ...errors, start: false, end: false, name: false });
          editMutation.mutate(meetingObject);
          dispatch(editEvent(meetingObject));
          setEditing(false);
        }
      } finally {
        setLoading(false);
      }
    }
  }

  function addMeeting() {
    setLoading(true);
    try {
      const startDate = parse(
        newMeeting.editStartDate,
        "dd/MM/yyyy HH:mm",
        new Date()
      );

      const endDate = parse(
        newMeeting.editEndDate,
        "dd/MM/yyyy HH:mm",
        new Date()
      );

      const startDateValid = isValid(startDate);
      const endDateValid = isValid(endDate);

      if (!startDateValid || !endDateValid || !newMeeting.name.length) {
        !newMeeting.name.length && setErrors({ ...errors, name: true });
        !startDateValid && setErrors({ ...errors, start: true });
        !endDateValid && setErrors({ ...errors, end: true });
      } else {
        const meetingBody = {
          ...newMeeting,
          id: meetings.length,
          startDatetime: startDate.toISOString(),
          endDatetime: endDate.toISOString(),
        };
        setErrors({ ...errors, start: false, end: false, name: false });
        createMutation.mutate(meetingBody);
        dispatch(createEvent(meetingBody));
        setAddingNewMeeting(false);
        setNewMeeting(newMeetingModel);
      }
    } finally {
      setLoading(false);
    }
  }

  console.log({ meetings });

  return (
    <div className="pt-16">
      <div className="max-w-md px-4 mx-auto sm:px-7 md:max-w-4xl md:px-6">
        <div className="md:grid md:grid-cols-2 md:divide-x md:divide-gray-200">
          <div className="md:pr-14">
            <div className="flex items-center">
              <h2 className="flex-auto font-semibold text-gray-900">
                {format(firstDayCurrentMonth, "MMMM yyyy")}
              </h2>
              <button
                type="button"
                onClick={previousMonth}
                className="-my-1.5 flex flex-none items-center justify-center p-1.5 text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">Previous month</span>
                <ChevronLeftIcon className="w-5 h-5" aria-hidden="true" />
              </button>
              <button
                onClick={nextMonth}
                type="button"
                className="-my-1.5 -mr-1.5 ml-2 flex flex-none items-center justify-center p-1.5 text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">Next month</span>
                <ChevronRightIcon className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <div className="grid grid-cols-7 mt-10 text-xs leading-6 text-center text-gray-500">
              <div>S</div>
              <div>M</div>
              <div>T</div>
              <div>W</div>
              <div>T</div>
              <div>F</div>
              <div>S</div>
            </div>
            <div className="grid grid-cols-7 mt-2 text-sm">
              {days.map((day, dayIdx) => (
                <div
                  key={day.toString()}
                  className={classNames(
                    dayIdx === 0 && colStartClasses[getDay(day)],
                    "py-1.5"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    className={classNames(
                      isEqual(day, selectedDay) && "text-white",
                      !isEqual(day, selectedDay) &&
                        isToday(day) &&
                        "text-red-500",
                      !isEqual(day, selectedDay) &&
                        !isToday(day) &&
                        isSameMonth(day, firstDayCurrentMonth) &&
                        "text-gray-900",
                      !isEqual(day, selectedDay) &&
                        !isToday(day) &&
                        !isSameMonth(day, firstDayCurrentMonth) &&
                        "text-gray-400",
                      isEqual(day, selectedDay) && isToday(day) && "bg-red-500",
                      isEqual(day, selectedDay) &&
                        !isToday(day) &&
                        "bg-gray-900",
                      !isEqual(day, selectedDay) && "hover:bg-gray-200",
                      (isEqual(day, selectedDay) || isToday(day)) &&
                        "font-semibold",
                      "mx-auto flex h-8 w-8 items-center justify-center rounded-full"
                    )}
                  >
                    <time dateTime={format(day, "yyyy-MM-dd")}>
                      {format(day, "d")}
                    </time>
                  </button>

                  <div className="w-1 h-1 mx-auto mt-1">
                    {meetings?.some((meeting) =>
                      isSameDay(parseISO(meeting.startDatetime), day)
                    ) && (
                      <div className="w-1 h-1 rounded-full bg-sky-500"></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <section className="mt-12 md:mt-0 md:pl-14">
            <>
              <h2 className="font-semibold text-gray-900">
                Schedule for{" "}
                <time dateTime={format(selectedDay, "yyyy-MM-dd")}>
                  {format(selectedDay, "MMM dd, yyy")}
                </time>
              </h2>

              {isLoading ? (
                <div
                  className="flex flex-row justify-center mt-14"
                  role="status"
                >
                  <svg
                    aria-hidden="true"
                    className="mr-2 w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600"
                    viewBox="0 0 100 101"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                      fill="currentColor"
                    ></path>
                    <path
                      d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                      fill="currentFill"
                    ></path>
                  </svg>
                  <span className="sr-only">Loading...</span>
                </div>
              ) : editing ? (
                <Inputs
                  selectedMeeting={selectedMeeting}
                  errors={errors}
                  loading={loading}
                  setEditing={setEditing}
                  setErrors={setErrors}
                  handleSaveMeeting={editMeeting}
                  handleInputChange={onInputChange}
                  setNewMeeting={setNewMeeting}
                  newMeetingModel={newMeetingModel}
                ></Inputs>
              ) : addingNewMeeting ? (
                <Inputs
                  selectedMeeting={newMeeting}
                  errors={errors}
                  loading={loading}
                  setEditing={setAddingNewMeeting}
                  setErrors={setErrors}
                  handleSaveMeeting={addMeeting}
                  handleInputChange={onInputHandle}
                  setNewMeeting={setNewMeeting}
                  newMeetingModel={newMeetingModel}
                ></Inputs>
              ) : (
                <button
                  onClick={() => setAddingNewMeeting(true)}
                  className="mt-4 space-y-1 text-sm leading-6 text-gray-500 px-4 py-5 min-w-full flex items-start rounded-xl focus-within:bg-gray-100 hover:bg-gray-100"
                >
                  {selectedDayMeetings?.length
                    ? "Add another event for today"
                    : "No events for today. Add one!"}
                </button>
              )}
              {!isLoading && (
                <ol className="mt-4 space-y-1 text-sm leading-6 text-gray-500">
                  {!!selectedDayMeetings?.length &&
                    !editing &&
                    !addingNewMeeting &&
                    selectedDayMeetings
                      ?.sort(
                        (a, b) =>
                          new Date(a.startDatetime).getTime() -
                          new Date(b.startDatetime).getTime()
                      )
                      .map((meeting) => (
                        <Meeting
                          meeting={meeting}
                          key={meeting.id}
                          cancelMeeting={cancelMeeting}
                          setEditing={setEditing}
                          setSelectedMeeting={setSelectedMeeting}
                        />
                      ))}
                </ol>
              )}
              {error && <p className="text-gray-500">An error has occurred.</p>}
            </>
          </section>
        </div>
      </div>
    </div>
  );
}

function Meeting({
  meeting,
  cancelMeeting,
  setEditing,
  setSelectedMeeting,
}: {
  meeting: Meeting;
  cancelMeeting: (arg0: Meeting) => void;
  setEditing: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedMeeting: React.Dispatch<React.SetStateAction<Meeting | undefined>>;
}) {
  const startDateTime = parseISO(meeting.startDatetime);
  const endDateTime = parseISO(meeting.endDatetime);

  return (
    <li className="flex items-center px-4 py-2 space-x-4 group rounded-xl focus-within:bg-gray-100 hover:bg-gray-100">
      <div className="flex-auto">
        <p className="text-gray-900">{meeting.name}</p>
        <p className="mt-0.5">
          <time dateTime={meeting.startDatetime}>
            {format(startDateTime, "HH:mm")}
          </time>{" "}
          -{" "}
          <time dateTime={meeting.endDatetime}>
            {format(endDateTime, "HH:mm")}
          </time>
        </p>
      </div>
      <Menu
        as="div"
        className="relative opacity-0 focus-within:opacity-100 group-hover:opacity-100"
      >
        <div>
          <Menu.Button className="-m-2 flex items-center rounded-full p-1.5 text-gray-500 hover:text-gray-600">
            <span className="sr-only">Open options</span>
            <DotsVerticalIcon className="w-6 h-6" aria-hidden="true" />
          </Menu.Button>
        </div>

        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items className="absolute right-0 z-10 mt-2 origin-top-right bg-white rounded-md shadow-lg w-36 ring-1 ring-black ring-opacity-5 focus:outline-none">
            <div className="py-1">
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={() => {
                      setEditing(true);
                      setSelectedMeeting({
                        ...meeting,
                        editStartDate: format(
                          parseISO(meeting.startDatetime),
                          "dd/MM/yyyy HH:mm"
                        ),
                        editEndDate: format(
                          parseISO(meeting.endDatetime),
                          "dd/MM/yyyy HH:mm"
                        ),
                      });
                    }}
                    className={classNames(
                      active ? "bg-gray-100 text-gray-900" : "text-gray-700",
                      "block px-4 py-2 text-sm min-w-full"
                    )}
                  >
                    Edit
                  </button>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={() => cancelMeeting(meeting)}
                    className={classNames(
                      active ? "bg-gray-100 text-gray-900" : "text-gray-700",
                      "block px-4 py-2 text-sm min-w-full"
                    )}
                  >
                    Cancel
                  </button>
                )}
              </Menu.Item>
            </div>
          </Menu.Items>
        </Transition>
      </Menu>
    </li>
  );
}

function Inputs({
  selectedMeeting,
  errors,
  loading,
  setEditing,
  handleSaveMeeting,
  handleInputChange,
  setErrors,
  setNewMeeting,
  newMeetingModel,
}: {
  selectedMeeting: Meeting | undefined;
  errors: Error;
  loading: boolean;
  setEditing: React.Dispatch<React.SetStateAction<boolean>>;
  handleSaveMeeting: () => void;
  handleInputChange: (arg0: string, arg1: string) => void;
  setErrors: React.Dispatch<React.SetStateAction<Error>>;
  setNewMeeting: React.Dispatch<React.SetStateAction<Meeting>>;
  newMeetingModel: Meeting;
}) {
  return (
    <div className="mt-4 space-y-1 text-sm leading-6 text-black-500 px-4 py-5 flex flex-col rounded-xl focus-within:bg-gray-100 bg-gray-100">
      <h1> Name </h1>
      <input
        className="mt-4 space-y-1 text-sm leading-6 text-gray-500 px-4 py-5 min-w-full rounded-xl focus-within:bg-gray-100 bg-gray-200"
        onChange={(event) => handleInputChange(event.target.value, "name")}
        value={selectedMeeting?.name}
      ></input>
      {errors.name && <p className="text-red-500">Name is required.</p>}

      <div className="flex flex-row text-black-500">
        <div className="flex flex-col">
          <h1> From </h1>
          <input
            className={classNames(
              errors.start ? "border-red-700 border" : "",
              "mt-2 mr-2 space-y-1 text-sm leading-6 text-gray-500 pl-2 py-5 rounded-xl focus-within:bg-gray-100 bg-gray-200"
            )}
            onChange={(event) =>
              handleInputChange(event.target.value, "editStartDate")
            }
            placeholder="dd/mm/yyyy hh:mm"
            value={selectedMeeting?.editStartDate}
          ></input>
        </div>

        <div className="flex flex-col">
          <h1> To </h1>
          <input
            className={classNames(
              errors.end ? "border-red-700 border" : "",
              "mt-2 space-y-1 text-sm leading-6 text-gray-500 pl-2 py-5 rounded-xl focus-within:bg-gray-100 bg-gray-200"
            )}
            onChange={(event) =>
              handleInputChange(event.target.value, "editEndDate")
            }
            placeholder="dd/mm/yyyy hh:mm"
            value={selectedMeeting?.editEndDate}
          ></input>
        </div>
      </div>
      {(errors.start || errors.end) && (
        <p className="text-red-500">Format must be dd/mm/yyyy hh:mm</p>
      )}

      <div className="flex flex-row text-black-500">
        <button
          disabled={loading}
          onClick={() => handleSaveMeeting()}
          className="mt-4 mr-2 space-y-1 text-sm leading-6 px-4 py-5 flex items-start rounded-xl bg-green-200 hover:bg-green-500"
        >
          Confirm
        </button>
        <button
          disabled={loading}
          onClick={() => {
            setEditing(false);
            setNewMeeting(newMeetingModel);
            setErrors({ ...errors, start: false, end: false, name: false });
          }}
          className="mt-4 ml-2 space-y-1 text-sm leading-6 px-4 py-5 flex items-start rounded-xl bg-red-200 hover:bg-red-500"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

const colStartClasses = [
  "",
  "col-start-2",
  "col-start-3",
  "col-start-4",
  "col-start-5",
  "col-start-6",
  "col-start-7",
];
