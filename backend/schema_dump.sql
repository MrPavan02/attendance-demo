--
-- PostgreSQL database dump
--

\restrict h3h9WsWgMudOyot1zZ81H2ujahv8O29uSHu9hMz913muCo42lCc0fyxJwgLp1Ol

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: attendancetype; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.attendancetype AS ENUM (
    'IN',
    'OUT'
);


--
-- Name: regularizationtype; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.regularizationtype AS ENUM (
    'LOGIN',
    'LOGOUT',
    'BOTH',
    'MISSED_CHECKIN',
    'MISSED_CHECKOUT',
    'FULL_DAY'
);


--
-- Name: requeststatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.requeststatus AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'CANCELLED'
);


--
-- Name: userrole; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.userrole AS ENUM (
    'EMPLOYEE',
    'HR'
);


--
-- Name: verificationmethod; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.verificationmethod AS ENUM (
    'BIOMETRIC',
    'PIN',
    'FACE_ONLY'
);


--
-- Name: workmode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.workmode AS ENUM (
    'OFFICE',
    'FIELD',
    'BRANCH',
    'WFH'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


--
-- Name: attendance_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendance_entries (
    id character varying NOT NULL,
    employee_id character varying NOT NULL,
    "timestamp" timestamp with time zone NOT NULL,
    type public.attendancetype NOT NULL,
    mode public.workmode NOT NULL,
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    is_flagged boolean,
    flag_reason character varying,
    field_work_reason character varying,
    device_id character varying NOT NULL,
    verification_method public.verificationmethod NOT NULL,
    duration double precision,
    image_data text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: attendance_locks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendance_locks (
    id character varying NOT NULL,
    date character varying NOT NULL,
    locked_by character varying,
    locked_at timestamp with time zone DEFAULT now()
);


--
-- Name: employee_week_offs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_week_offs (
    id character varying NOT NULL,
    employee_id character varying NOT NULL,
    week_offs integer[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone
);


--
-- Name: holidays; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.holidays (
    id character varying NOT NULL,
    date character varying NOT NULL,
    name character varying NOT NULL,
    country character varying NOT NULL,
    state character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    created_by character varying
);


--
-- Name: overtime_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.overtime_requests (
    id character varying NOT NULL,
    employee_id character varying NOT NULL,
    date character varying NOT NULL,
    hours double precision NOT NULL,
    reason text NOT NULL,
    status public.requeststatus NOT NULL,
    approved_by character varying,
    approved_at timestamp with time zone,
    submitted_at timestamp with time zone DEFAULT now()
);


--
-- Name: permission_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permission_requests (
    id character varying NOT NULL,
    employee_id character varying NOT NULL,
    date character varying NOT NULL,
    start_time character varying NOT NULL,
    end_time character varying NOT NULL,
    reason text NOT NULL,
    status public.requeststatus NOT NULL,
    approved_by character varying,
    approved_at timestamp with time zone,
    submitted_at timestamp with time zone DEFAULT now()
);


--
-- Name: regularization_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.regularization_requests (
    id character varying NOT NULL,
    employee_id character varying NOT NULL,
    date character varying NOT NULL,
    type public.regularizationtype NOT NULL,
    actual_time character varying,
    requested_login_time character varying,
    requested_logout_time character varying,
    reason text NOT NULL,
    remarks text,
    status public.requeststatus NOT NULL,
    approved_by character varying,
    approved_at timestamp with time zone,
    submitted_at timestamp with time zone DEFAULT now()
);


--
-- Name: shift_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shift_assignments (
    id character varying NOT NULL,
    employee_id character varying NOT NULL,
    shift_id character varying NOT NULL,
    date character varying NOT NULL,
    effective_from timestamp with time zone NOT NULL,
    effective_to timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    assigned_by character varying
);


--
-- Name: shift_change_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shift_change_requests (
    id character varying NOT NULL,
    employee_id character varying NOT NULL,
    current_shift_id character varying NOT NULL,
    requested_shift_id character varying NOT NULL,
    date character varying NOT NULL,
    reason text NOT NULL,
    status public.requeststatus NOT NULL,
    approved_by character varying,
    approved_at timestamp with time zone,
    submitted_at timestamp with time zone DEFAULT now()
);


--
-- Name: shifts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shifts (
    id character varying NOT NULL,
    name character varying NOT NULL,
    start_time character varying NOT NULL,
    end_time character varying NOT NULL,
    description character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id character varying NOT NULL,
    employee_id character varying NOT NULL,
    name character varying NOT NULL,
    email character varying,
    hashed_password character varying NOT NULL,
    department character varying NOT NULL,
    role public.userrole NOT NULL,
    is_active boolean,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone,
    last_login timestamp with time zone
);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: attendance_entries attendance_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_entries
    ADD CONSTRAINT attendance_entries_pkey PRIMARY KEY (id);


--
-- Name: attendance_locks attendance_locks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_locks
    ADD CONSTRAINT attendance_locks_pkey PRIMARY KEY (id);


--
-- Name: employee_week_offs employee_week_offs_employee_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_week_offs
    ADD CONSTRAINT employee_week_offs_employee_id_key UNIQUE (employee_id);


--
-- Name: employee_week_offs employee_week_offs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_week_offs
    ADD CONSTRAINT employee_week_offs_pkey PRIMARY KEY (id);


--
-- Name: holidays holidays_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.holidays
    ADD CONSTRAINT holidays_pkey PRIMARY KEY (id);


--
-- Name: overtime_requests overtime_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.overtime_requests
    ADD CONSTRAINT overtime_requests_pkey PRIMARY KEY (id);


--
-- Name: permission_requests permission_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permission_requests
    ADD CONSTRAINT permission_requests_pkey PRIMARY KEY (id);


--
-- Name: regularization_requests regularization_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regularization_requests
    ADD CONSTRAINT regularization_requests_pkey PRIMARY KEY (id);


--
-- Name: shift_assignments shift_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_assignments
    ADD CONSTRAINT shift_assignments_pkey PRIMARY KEY (id);


--
-- Name: shift_change_requests shift_change_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_change_requests
    ADD CONSTRAINT shift_change_requests_pkey PRIMARY KEY (id);


--
-- Name: shifts shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT shifts_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: ix_attendance_entries_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_attendance_entries_employee_id ON public.attendance_entries USING btree (employee_id);


--
-- Name: ix_attendance_entries_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_attendance_entries_id ON public.attendance_entries USING btree (id);


--
-- Name: ix_attendance_entries_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_attendance_entries_timestamp ON public.attendance_entries USING btree ("timestamp");


--
-- Name: ix_attendance_locks_date; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_attendance_locks_date ON public.attendance_locks USING btree (date);


--
-- Name: ix_attendance_locks_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_attendance_locks_id ON public.attendance_locks USING btree (id);


--
-- Name: ix_employee_week_offs_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_employee_week_offs_id ON public.employee_week_offs USING btree (id);


--
-- Name: ix_holidays_country; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_holidays_country ON public.holidays USING btree (country);


--
-- Name: ix_holidays_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_holidays_date ON public.holidays USING btree (date);


--
-- Name: ix_holidays_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_holidays_id ON public.holidays USING btree (id);


--
-- Name: ix_holidays_state; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_holidays_state ON public.holidays USING btree (state);


--
-- Name: ix_overtime_requests_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_overtime_requests_date ON public.overtime_requests USING btree (date);


--
-- Name: ix_overtime_requests_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_overtime_requests_employee_id ON public.overtime_requests USING btree (employee_id);


--
-- Name: ix_overtime_requests_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_overtime_requests_id ON public.overtime_requests USING btree (id);


--
-- Name: ix_permission_requests_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_permission_requests_date ON public.permission_requests USING btree (date);


--
-- Name: ix_permission_requests_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_permission_requests_employee_id ON public.permission_requests USING btree (employee_id);


--
-- Name: ix_permission_requests_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_permission_requests_id ON public.permission_requests USING btree (id);


--
-- Name: ix_regularization_requests_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_regularization_requests_date ON public.regularization_requests USING btree (date);


--
-- Name: ix_regularization_requests_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_regularization_requests_employee_id ON public.regularization_requests USING btree (employee_id);


--
-- Name: ix_regularization_requests_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_regularization_requests_id ON public.regularization_requests USING btree (id);


--
-- Name: ix_shift_assignments_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_shift_assignments_date ON public.shift_assignments USING btree (date);


--
-- Name: ix_shift_assignments_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_shift_assignments_employee_id ON public.shift_assignments USING btree (employee_id);


--
-- Name: ix_shift_assignments_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_shift_assignments_id ON public.shift_assignments USING btree (id);


--
-- Name: ix_shift_change_requests_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_shift_change_requests_date ON public.shift_change_requests USING btree (date);


--
-- Name: ix_shift_change_requests_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_shift_change_requests_employee_id ON public.shift_change_requests USING btree (employee_id);


--
-- Name: ix_shift_change_requests_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_shift_change_requests_id ON public.shift_change_requests USING btree (id);


--
-- Name: ix_shifts_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_shifts_id ON public.shifts USING btree (id);


--
-- Name: ix_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_users_email ON public.users USING btree (email);


--
-- Name: ix_users_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_users_employee_id ON public.users USING btree (employee_id);


--
-- Name: ix_users_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_users_id ON public.users USING btree (id);


--
-- Name: attendance_entries attendance_entries_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_entries
    ADD CONSTRAINT attendance_entries_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.users(employee_id);


--
-- Name: attendance_locks attendance_locks_locked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_locks
    ADD CONSTRAINT attendance_locks_locked_by_fkey FOREIGN KEY (locked_by) REFERENCES public.users(employee_id) ON UPDATE CASCADE;


--
-- Name: employee_week_offs employee_week_offs_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_week_offs
    ADD CONSTRAINT employee_week_offs_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.users(employee_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: overtime_requests overtime_requests_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.overtime_requests
    ADD CONSTRAINT overtime_requests_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(employee_id);


--
-- Name: overtime_requests overtime_requests_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.overtime_requests
    ADD CONSTRAINT overtime_requests_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.users(employee_id);


--
-- Name: permission_requests permission_requests_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permission_requests
    ADD CONSTRAINT permission_requests_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(employee_id);


--
-- Name: permission_requests permission_requests_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permission_requests
    ADD CONSTRAINT permission_requests_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.users(employee_id);


--
-- Name: regularization_requests regularization_requests_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regularization_requests
    ADD CONSTRAINT regularization_requests_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(employee_id);


--
-- Name: regularization_requests regularization_requests_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regularization_requests
    ADD CONSTRAINT regularization_requests_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.users(employee_id);


--
-- Name: shift_assignments shift_assignments_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_assignments
    ADD CONSTRAINT shift_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(employee_id);


--
-- Name: shift_assignments shift_assignments_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_assignments
    ADD CONSTRAINT shift_assignments_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.users(employee_id);


--
-- Name: shift_assignments shift_assignments_shift_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_assignments
    ADD CONSTRAINT shift_assignments_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id);


--
-- Name: shift_change_requests shift_change_requests_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_change_requests
    ADD CONSTRAINT shift_change_requests_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(employee_id);


--
-- Name: shift_change_requests shift_change_requests_current_shift_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_change_requests
    ADD CONSTRAINT shift_change_requests_current_shift_id_fkey FOREIGN KEY (current_shift_id) REFERENCES public.shifts(id);


--
-- Name: shift_change_requests shift_change_requests_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_change_requests
    ADD CONSTRAINT shift_change_requests_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.users(employee_id);


--
-- Name: shift_change_requests shift_change_requests_requested_shift_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_change_requests
    ADD CONSTRAINT shift_change_requests_requested_shift_id_fkey FOREIGN KEY (requested_shift_id) REFERENCES public.shifts(id);


--
-- PostgreSQL database dump complete
--

\unrestrict h3h9WsWgMudOyot1zZ81H2ujahv8O29uSHu9hMz913muCo42lCc0fyxJwgLp1Ol

