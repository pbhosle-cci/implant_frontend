"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { transformMesh } from "@/lib/api";
import { identity3, rotationMatrix, matMul } from "@/lib/math";
import type { TransformResult, ScanMeta } from "@/types";

export function useTransform(scan: ScanMeta | null, hasMesh: boolean) {
  const [rotation, setRotation]               = useState<number[][]>(identity3());
  const [translation, setTranslation]         = useState<number[]>([0, 0, 0]);
  const [voxelPoints, setVoxelPoints]         = useState<number[][] | null>(null);
  const [worldPoints, setWorldPoints]         = useState<number[][] | null>(null);
  const [centerVoxel, setCenterVoxel]         = useState<number[] | null>(null);

  // Keep latest values in refs so the keyboard handler always sees current state
  const rotRef   = useRef(rotation);
  const transRef = useRef(translation);
  useEffect(() => { rotRef.current   = rotation;    }, [rotation]);
  useEffect(() => { transRef.current = translation; }, [translation]);

  const sendTransform = useCallback(async (R: number[][], T: number[]) => {
    setRotation(R);
    setTranslation(T);
    const result: TransformResult = await transformMesh(R, T);
    setWorldPoints(result.points);
    setVoxelPoints(result.voxel_points);
    setCenterVoxel(result.center_voxel);
  }, []);

  // Call this right after mesh upload to seed initial voxel points + center
  const initFromMesh = useCallback((vox: number[][], center: number[]) => {
    setRotation(identity3());
    setTranslation([0, 0, 0]);
    setVoxelPoints(vox);
    setCenterVoxel(center);
    setWorldPoints(null);
  }, []);

  // Reset when a new mesh is loaded
  const resetTransform = useCallback(() => {
    setRotation(identity3());
    setTranslation([0, 0, 0]);
    setVoxelPoints(null);
    setWorldPoints(null);
    setCenterVoxel(null);
  }, []);

  // Jump implant to a voxel position (3D click or go-to-center)
  const jumpToVoxel = useCallback((voxelPos: number[]) => {
    if (!centerVoxel) return;
    const delta = voxelPos.map((v, i) => v - centerVoxel[i]);
    const newT = transRef.current.map((t, i) => t + delta[i]);
    sendTransform(rotRef.current, newT);
  }, [centerVoxel, sendTransform]);

  // Translate by a voxel delta
  const translate = useCallback((dx: number, dy: number, dz: number) => {
    const newT = [
      transRef.current[0] + dx,
      transRef.current[1] + dy,
      transRef.current[2] + dz,
    ];
    sendTransform(rotRef.current, newT);
  }, [sendTransform]);

  // Rotate around an axis by degrees
  const rotate = useCallback((axis: "x"|"y"|"z", angleDeg: number) => {
    const dR  = rotationMatrix(axis, angleDeg);
    const newR = matMul(dR, rotRef.current);
    sendTransform(newR, transRef.current);
  }, [sendTransform]);

  // Keyboard controls — same as desktop app
  useEffect(() => {
    if (!hasMesh) return;

    function onKeyDown(e: KeyboardEvent) {
      // Don't fire when typing in inputs
      if (document.activeElement?.tagName === "INPUT") return;

      const angle = e.shiftKey ? 90 : 10;
      switch (e.key.toLowerCase()) {
        case "a": e.preventDefault(); rotate("x", -angle); break;
        case "d": e.preventDefault(); rotate("x",  angle); break;
        case "q": e.preventDefault(); rotate("y", -angle); break;
        case "e": e.preventDefault(); rotate("y",  angle); break;
        case "w": e.preventDefault(); rotate("z",  angle); break;
        case "s": e.preventDefault(); rotate("z", -angle); break;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [hasMesh, rotate]);

  return {
    rotation,
    translation,
    voxelPoints,
    worldPoints,
    centerVoxel,
    sendTransform,
    resetTransform,
    initFromMesh,
    translate,
    rotate,
    jumpToVoxel,
  };
}
